import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Preço em Real (R$ XX,XX ou variações comuns)
PRICE_REGEX = re.compile(r'(?:R\$\s*|BRL\s*)?(\d{1,4}(?:[.,]\d{2,3})*(?:[.,]\d{2}))', re.IGNORECASE)
PHONE_REGEX = re.compile(r'(?:\+?55\s*)?(?:\(?([1-9]{2})\)?\s*)?((?:9\s*)?\d{4}[-\s]?\d{4})')
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')


def fetch_with_resilient_fallback(url: str, timeout: int = 15) -> Tuple[Any, str]:
    """
    Busca a página utilizando Scrapling.
    Tenta primeiro o StealthyFetcher (navegador headless patchright / anti-detect).
    Se falhar (ex: falta de Chromium/Playwright em ambiente de produção, erro de timeout ou headless),
    faz fallback imediato e transparente para o Fetcher HTTP (curl_cffi/adaptor leve).
    """
    from scrapling.fetchers import Fetcher

    # 1. Tentativa com StealthyFetcher (navegador headless)
    try:
        from scrapling.fetchers import StealthyFetcher
        logger.info(f"[Scraper] Tentando StealthyFetcher para: {url}")
        # timeout em ms para StealthyFetcher
        response = StealthyFetcher.fetch(url, timeout=timeout * 1000, headless=True)
        if response and response.status in (200, 301, 302):
            return response, "stealth_browser"
    except Exception as e:
        logger.warning(
            f"[Scraper] StealthyFetcher falhou ou ambiente sem navegador headless ({type(e).__name__}: {e}). "
            f"Ativando fallback HTTP para {url}"
        )

    # 2. Fallback resiliente com Fetcher leve (HTTP / curl_cffi)
    logger.info(f"[Scraper] Executando Fetcher HTTP para: {url}")
    try:
        response = Fetcher.get(url, timeout=timeout)
        return response, "http_fallback"
    except Exception as e:
        logger.error(f"[Scraper] Fetcher HTTP também falhou para {url}: {e}")
        raise RuntimeError(f"Não foi possível acessar a URL {url}: {e}") from e


def extract_cardapio_and_products(response: Any) -> List[Dict[str, Any]]:
    """
    Extrai itens de cardápio, catálogo ou produtos a partir do HTML usando seletores do Scrapling.
    """
    items: List[Dict[str, Any]] = []
    seen_names = set()

    # Seletores comuns em sites de restaurantes, deliverys e catálogos
    candidate_selectors = [
        ".cardapio-item", ".menu-item", ".produto", ".product-item",
        ".item-cardapio", ".prato", ".dish", ".product-card",
        "[data-item-id]", ".catalog-item", ".food-item"
    ]

    elements = []
    for sel in candidate_selectors:
        try:
            found = response.css(sel)
            if found:
                elements.extend(found)
        except Exception:
            pass

    # Se seletores específicos não encontrarem nada, procurar em divs/artigos/lis que tenham menção a R$
    if not elements:
        try:
            for el in response.css("div, article, li, section"):
                txt = el.get_all_text() if hasattr(el, "get_all_text") else el.text
                if txt and ("R$" in txt or "BRL" in txt):
                    # Não pegar containers gigantescos
                    if len(txt) < 350:
                        elements.append(el)
        except Exception:
            pass

    for el in elements:
        try:
            raw_text = el.get_all_text() if hasattr(el, "get_all_text") else (el.text or "")
            raw_text = " ".join(raw_text.split())
            if not raw_text:
                continue

            # Extração de preço
            price_match = re.search(r'(R\$\s*\d+[\d,.]*)', raw_text)
            preco = price_match.group(1).strip() if price_match else ""

            # Extração de nome
            nome = ""
            for tag in ["h2", "h3", "h4", "strong", "b", ".title", ".nome", ".name"]:
                try:
                    title_nodes = el.css(tag)
                    if title_nodes:
                        cand_nome = title_nodes[0].get_all_text() if hasattr(title_nodes[0], "get_all_text") else title_nodes[0].text
                        cand_nome = cand_nome.strip()
                        if cand_nome and len(cand_nome) > 2 and len(cand_nome) < 100:
                            nome = cand_nome
                            break
                except Exception:
                    pass

            if not nome:
                # Tenta pegar a primeira linha do texto antes do preço
                parts = raw_text.split(" - ")
                if len(parts) > 1 and len(parts[0]) < 80:
                    nome = parts[0].strip()
                else:
                    first_line = raw_text.split("\n")[0].strip()
                    if 3 <= len(first_line) <= 80 and not first_line.startswith("R$"):
                        nome = first_line

            if not nome or len(nome) < 3:
                continue

            clean_name_key = nome.lower()
            if clean_name_key in seen_names:
                continue
            seen_names.add(clean_name_key)

            # Extração de descrição
            descricao = ""
            for desc_sel in [".desc", ".descricao", ".description", "p", "span"]:
                try:
                    desc_nodes = el.css(desc_sel)
                    for dn in desc_nodes:
                        cand_desc = dn.get_all_text() if hasattr(dn, "get_all_text") else dn.text
                        cand_desc = cand_desc.strip()
                        if cand_desc and cand_desc != nome and not cand_desc.startswith("R$") and len(cand_desc) > 8:
                            descricao = cand_desc
                            break
                    if descricao:
                        break
                except Exception:
                    pass

            # Imagem do item
            imagem_url = ""
            try:
                imgs = el.css("img")
                if imgs:
                    img = imgs[0]
                    cand_src = img.attrib.get("src") or img.attrib.get("data-src") or img.attrib.get("data-lazy-src")
                    if cand_src and cand_src.startswith("http"):
                        imagem_url = cand_src
            except Exception:
                pass

            items.append({
                "nome": nome,
                "preco": preco,
                "descricao": descricao[:300] if descricao else "",
                "imagem_url": imagem_url
            })

            if len(items) >= 40:  # Limite saudável por site
                break
        except Exception:
            continue

    return items


def extract_institutional_data(response: Any, raw_markdown: str) -> Dict[str, Any]:
    """
    Extrai informações institucionais, história/sobre, serviços e dados de contato.
    """
    # 1. Metadados básicos
    title = ""
    try:
        t_nodes = response.css("title::text")
        if t_nodes:
            title = t_nodes[0].strip()
    except Exception:
        pass
    if not title:
        try:
            og_title = response.css('meta[property="og:title"]::attr(content)')
            if og_title:
                title = og_title[0].strip()
        except Exception:
            pass

    description = ""
    try:
        desc_nodes = response.css('meta[name="description"]::attr(content)')
        if desc_nodes:
            description = desc_nodes[0].strip()
        elif response.css('meta[property="og:description"]::attr(content)'):
            description = response.css('meta[property="og:description"]::attr(content)')[0].strip()
    except Exception:
        pass

    # 2. Textos sobre nós / institucional
    sobre_nos = ""
    about_candidates = []
    try:
        for sel in ["#sobre", "#about", ".sobre", ".about", ".quem-somos", ".institucional", "section"]:
            for el in response.css(sel):
                txt = el.get_all_text() if hasattr(el, "get_all_text") else (el.text or "")
                txt = " ".join(txt.split())
                low = txt.lower()
                if ("sobre nós" in low or "quem somos" in low or "nossa história" in low or "nossa missão" in low) and len(txt) > 40:
                    about_candidates.append(txt)
    except Exception:
        pass

    if about_candidates:
        sobre_nos = max(about_candidates, key=len)[:1000]
    elif description:
        sobre_nos = description

    # 3. Serviços ou diferenciais
    servicos = []
    try:
        for sel in [".servicos", "#servicos", ".services", "#services", ".diferenciais"]:
            for el in response.css(sel):
                for item in el.css("li, h3, h4, p"):
                    txt = (item.get_all_text() if hasattr(item, "get_all_text") else item.text).strip()
                    if 5 <= len(txt) <= 120 and txt not in servicos:
                        servicos.append(txt)
                    if len(servicos) >= 10:
                        break
    except Exception:
        pass

    # 4. Dados de contato a partir do Markdown ou HTML
    full_text = raw_markdown or ""
    try:
        if hasattr(response, "get_all_text"):
            full_text += " " + response.get_all_text()
    except Exception:
        pass

    # Telefones
    raw_phones = PHONE_REGEX.findall(full_text)
    telefones = []
    for ddd, num in raw_phones:
        formatted = f"({ddd}) {num}" if ddd else num
        if formatted not in telefones:
            telefones.append(formatted)
        if len(telefones) >= 3:
            break

    # E-mails
    emails = list(set(EMAIL_REGEX.findall(full_text)))[:3]

    # Endereços (procura menções a Ruas / Avenidas)
    enderecos = []
    addr_match = re.findall(r'((?:Rua|Av\.|Avenida|Travessa|Alameda|Praça)\s+[^,\n]+,\s*\d+[^.\n]*)', full_text, re.IGNORECASE)
    for a in addr_match:
        a_clean = " ".join(a.split()).strip()
        if len(a_clean) < 120 and a_clean not in enderecos:
            enderecos.append(a_clean)
        if len(enderecos) >= 2:
            break

    return {
        "titulo": title,
        "descricao": description,
        "sobre": sobre_nos,
        "servicos": servicos[:8],
        "contato": {
            "telefones": telefones,
            "emails": emails,
            "enderecos": enderecos
        }
    }


def scrape_urls_deep(urls: List[str], timeout: int = 15) -> Dict[str, Any]:
    """
    Coordena a raspagem profunda de múltiplas URLs com fallback automático e estruturação rica.
    """
    valid_urls = [u.strip() for u in urls if u and u.strip().startswith("http")]
    if not valid_urls:
        return {
            "sucesso": False,
            "erro": "Nenhuma URL válida fornecida para raspagem.",
            "cardapio": [],
            "institucional": {},
            "markdown_resumo": "",
            "metodo_utilizado": "none"
        }

    all_cardapio: List[Dict[str, Any]] = []
    seen_products = set()
    aggregated_institucional: Dict[str, Any] = {
        "titulo": "",
        "descricao": "",
        "sobre": "",
        "servicos": [],
        "contato": {
            "telefones": [],
            "emails": [],
            "enderecos": []
        }
    }
    markdown_chunks: List[str] = []
    methods_used = set()

    for url in valid_urls[:5]:  # Máximo de 5 URLs por lead para evitar travamento
        try:
            resp, method = fetch_with_resilient_fallback(url, timeout=timeout)
            methods_used.add(method)

            # Obter markdown da página
            raw_md = ""
            try:
                if hasattr(resp, "markdown") and callable(resp.markdown):
                    raw_md = resp.markdown()
                elif hasattr(resp, "text"):
                    raw_md = resp.text
            except Exception:
                raw_md = ""

            # 1. Extração de produtos / cardápio
            items = extract_cardapio_and_products(resp)
            for it in items:
                k = it["nome"].lower()
                if k not in seen_products:
                    seen_products.add(k)
                    all_cardapio.append(it)

            # 2. Extração institucional
            inst = extract_institutional_data(resp, raw_md)
            if not aggregated_institucional["titulo"] and inst.get("titulo"):
                aggregated_institucional["titulo"] = inst["titulo"]
            if not aggregated_institucional["descricao"] and inst.get("descricao"):
                aggregated_institucional["descricao"] = inst["descricao"]
            if not aggregated_institucional["sobre"] and inst.get("sobre"):
                aggregated_institucional["sobre"] = inst["sobre"]
            
            for serv in inst.get("servicos", []):
                if serv not in aggregated_institucional["servicos"]:
                    aggregated_institucional["servicos"].append(serv)

            for tel in inst.get("contato", {}).get("telefones", []):
                if tel not in aggregated_institucional["contato"]["telefones"]:
                    aggregated_institucional["contato"]["telefones"].append(tel)

            for em in inst.get("contato", {}).get("emails", []):
                if em not in aggregated_institucional["contato"]["emails"]:
                    aggregated_institucional["contato"]["emails"].append(em)

            for addr in inst.get("contato", {}).get("enderecos", []):
                if addr not in aggregated_institucional["contato"]["enderecos"]:
                    aggregated_institucional["contato"]["enderecos"].append(addr)

            if raw_md:
                clean_md = "\n".join([line for line in raw_md.split("\n") if line.strip()][:150])
                markdown_chunks.append(f"### Conteúdo de {url}:\n{clean_md}")

        except Exception as e:
            logger.error(f"[Scraper] Falha ao raspar {url}: {e}")
            markdown_chunks.append(f"### Erro ao acessar {url}:\n{str(e)}")

    final_method = "stealth_browser" if "stealth_browser" in methods_used else ("http_fallback" if methods_used else "failed")

    # Monta um resumo consolidado em Markdown formatado
    summary_sections = [
        f"# Dados Raspados do Estabelecimento",
        f"**Método de Coleta**: {final_method}",
        f"**Data da Coleta**: {datetime.now(timezone.utc).isoformat()}",
        f"**URLs Processadas**: {', '.join(valid_urls)}"
    ]

    if aggregated_institucional.get("titulo"):
        summary_sections.append(f"\n## Título & Descrição Institucional\n**{aggregated_institucional['titulo']}**\n{aggregated_institucional.get('descricao', '')}")

    if aggregated_institucional.get("sobre"):
        summary_sections.append(f"\n## Sobre Nós / História\n{aggregated_institucional['sobre']}")

    if aggregated_institucional.get("servicos"):
        serv_lines = "\n".join([f"- {s}" for s in aggregated_institucional["servicos"]])
        summary_sections.append(f"\n## Serviços & Diferenciais\n{serv_lines}")

    if all_cardapio:
        summary_sections.append(f"\n## Catálogo de Produtos / Cardápio Encontrado ({len(all_cardapio)} itens)")
        for item in all_cardapio[:25]:
            preco_str = f" - **{item['preco']}**" if item.get('preco') else ""
            desc_str = f": {item['descricao']}" if item.get('descricao') else ""
            summary_sections.append(f"- **{item['nome']}**{preco_str}{desc_str}")

    contatos = aggregated_institucional.get("contato", {})
    if contatos.get("telefones") or contatos.get("emails") or contatos.get("enderecos"):
        summary_sections.append("\n## Dados de Contato Extraídos")
        if contatos.get("telefones"):
            summary_sections.append(f"- Telefones: {', '.join(contatos['telefones'])}")
        if contatos.get("emails"):
            summary_sections.append(f"- E-mails: {', '.join(contatos['emails'])}")
        if contatos.get("enderecos"):
            summary_sections.append(f"- Endereços: {', '.join(contatos['enderecos'])}")

    markdown_consolidado = "\n".join(summary_sections)

    return {
        "sucesso": True,
        "urls": valid_urls,
        "metodo_utilizado": final_method,
        "cardapio": all_cardapio,
        "institucional": aggregated_institucional,
        "markdown_resumo": markdown_consolidado,
        "raspado_em": datetime.now(timezone.utc).isoformat()
    }
