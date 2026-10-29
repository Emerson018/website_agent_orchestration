import hashlib
import re
import unicodedata
from typing import Any, Dict, List


LAYOUT_ARCHETYPES: Dict[str, Dict[str, Any]] = {
    "editorial_asymmetric": {
        "id": "editorial_asymmetric",
        "label": "Editorial Split-Screen Assimétrico",
        "description": (
            "Abertura em coluna assimétrica 7/5 estilo revista impressa com manifesto da casa à esquerda, "
            "retrato vertical emoldurado à direita e catálogo numerado (01, 02, 03) em linhas horizontais."
        ),
        "section_blueprint": [
            "1. Hero Editorial 7/5: Headline tipográfica de grande escala + Manifesto da marca + Retrato vertical emoldurado",
            "2. Índice Numerado de Especialidades: Linhas horizontais com índice tipográfico (01..0N), descrição técnica, valor e ação direta para /agendar",
            "3. Dossiê de Ofício & Bastidores: Bloco assimétrico destacando os 3 pilares reais do estabelecimento",
            "4. Ficha de Visita & Reserva: Painel arquitetônico com endereço, expediente e chamada final para agendamento",
        ],
    },
    "bento_modular": {
        "id": "bento_modular",
        "label": "Bento Grid Modular de Alta Precisão",
        "description": (
            "Composição em mosaico técnico de células assimétricas (col-span-8 + col-span-4), "
            "combinando vitrine principal, células de métricas/horários ao vivo e grade modular de serviços."
        ),
        "section_blueprint": [
            "1. Bento Hero Mosaico: Célula principal (8 colunas) com proposta de valor + 2 células laterais (4 colunas) com horário e localização rápida",
            "2. Matriz Modular de Serviços: Grid assimétrico em células com bordas expostas, badge técnico, preço em destaque e link para /agendar",
            "3. Painel de Diferenciais Operacionais: 3 células técnicas lado a lado detalhando os pilares reais da marca",
            "4. Barra de Ação & Atendimento Direto: Bloco compacto de conversão imediata para a agenda online",
        ],
    },
    "cinematic_immersive": {
        "id": "cinematic_immersive",
        "label": "Vitrine Cinematográfica Imersiva",
        "description": (
            "Abertura em tela cheia com imagem atmosférica em scrim profundo, tipografia dramática centralizada, "
            "barra flutuante de reserva e galeria de especialidades em cartões horizontais panorâmicos."
        ),
        "section_blueprint": [
            "1. Palco Cinematográfico Full-Bleed: Fotografia ambiente com scrim graduado, título monumental e dupla de botões de reserva",
            "2. Vitrine Panorâmica da Casa: Cartões largos com fotografia em close-up, selo de especialidade, preço e botão para /agendar",
            "3. Manifesto & Ritual da Casa: Seção de contraste profundo narrando a essência do negócio e seus pilares",
            "4. Coordenadas & Recepção: Bloco de endereço, telefone e reserva com hora marcada",
        ],
    },
    "swiss_typographic_catalog": {
        "id": "swiss_typographic_catalog",
        "label": "Catálogo Tipográfico Swiss-Grid",
        "description": (
            "Grade suíça rigorosa com filetes divisórios de 1px expostos, forte hierarquia tipográfica, "
            "tabela técnica de serviços e preços estilo cardápio/ateliê de precisão e zero ornamentos supérfluos."
        ),
        "section_blueprint": [
            "1. Cabeçalho Tipográfico Swiss-Grid: Grid de 12 colunas com filetes visíveis, título em escala máxima e metadados de expediente no topo",
            "2. Tabela Canônica de Serviços & Valores: Estrutura tabular estilo bancada/ateliê com nome, especificação, valor alinhado e botão /agendar",
            "3. Princípios da Casa em Colunas: 3 colunas divididas por filetes verticais apresentando os pilares reais do negócio",
            "4. Terminal de Localização & Agendamento: Rodapé funcional de seção com dados de visita e link direto para /agendar",
        ],
    },
    "narrative_scrollytelling": {
        "id": "narrative_scrollytelling",
        "label": "Jornada Narrativa em Etapas (Scrollytelling)",
        "description": (
            "Fluxo progressivo que conduz o visitante pela história e proposta da marca, apresenta como funciona "
            "o atendimento em etapas numeradas e exibe o portfólio de serviços com reserva integrada."
        ),
        "section_blueprint": [
            "1. Abertura Narrativa & Proposta de Valor: Composição dividida com destaque para a transformação entregue ao cliente e imagem âncora",
            "2. A Experiência Passo a Passo: Trilha visual dos 3 pilares de atendimento da marca com animações de entrada suaves",
            "3. Cardápio Completo de Especialidades: Lista detalhada dos serviços reais com preços transparentes e ação para /agendar",
            "4. Convite de Agendamento & Endereço: Fechamento acolhedor com horários de funcionamento e botão principal de reserva",
        ],
    },
}


def select_layout_archetype(
    app_name: str, context: str = "", niche_key: str = "servicos"
) -> Dict[str, Any]:
    """
    Seleciona de forma determinística e contextual um dos 5 arquétipos estruturais de layout,
    garantindo que estabelecimentos diferentes (mesmo dentro do mesmo nicho) recebam
    estruturas de página distintas e coerentes com seu briefing.
    """
    norm = strip_accents(f"{app_name} {context}".lower())

    if re.search(r"\b(catalogo|tabela|minimalista|suico|swiss|precisao|clinico|protocolo)\b", norm):
        chosen_key = "swiss_typographic_catalog"
    elif re.search(r"\b(bento|modular|mosaico|tecnologia|moderno|dashboard|express|studio)\b", norm):
        chosen_key = "bento_modular"
    elif re.search(r"\b(brasa|fogo|parrilla|cinema|imersivo|noite|bar|chopp|gourmet|artesanal)\b", norm):
        chosen_key = "cinematic_immersive"
    elif re.search(r"\b(historia|jornada|etapas|cuidado|bem-estar|terapia|familia|pet)\b", norm):
        chosen_key = "narrative_scrollytelling"
    else:
        keys = list(LAYOUT_ARCHETYPES.keys())
        digest = int(hashlib.sha256(f"{app_name.strip().lower()}:{niche_key}".encode("utf-8")).hexdigest(), 16)
        chosen_key = keys[digest % len(keys)]

    return dict(LAYOUT_ARCHETYPES[chosen_key])


def strip_accents(text: str) -> str:
    if not text:
        return ""
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


def resolve_niche_profile(text: str, app_name: str = "AppCustomizado") -> Dict[str, Any]:
    """
    Resolve o Niche Profile canônico para um segmento de mercado com base no
    Lead Briefing e nome do aplicativo.
    """
    display_name = app_name or "AppCustomizado"
    raw_combined = f"{display_name} {text or ''}".lower()
    norm = strip_accents(raw_combined)

    if re.search(
        r"\b(odont|odontologia|dente|dentes|sorriso|dentista|dentistas|saude|clinica|medico|doutor)\b",
        norm,
    ):
        return {
            "niche_key": "odontologia",
            "niche": "Odontologia & Saúde",
            "rag_niche": "Saúde & Odontologia",
            "palette_name": "Azul Clínico Confiável",
            "vibe": "Clínico, Confiável, Limpo e Acolhedor",
            "primary_color": "#0EA5E9",
            "secondary_color": "#0284C7",
            "bg_color": "#F8FAFC",
            "surface_color": "#FFFFFF",
            "border_color": "#E2E8F0",
            "text_color": "#0F172A",
            "muted_color": "#475569",
            "theme": "light",
            "font_heading": "Plus Jakarta Sans",
            "font_body": "Source Sans 3",
            "border_radius": "rounded-xl",
            "button_style": "flat",
            "shadow": "shadow-sm",
            "photo_style": "Imagens iluminadas, ambientes clínicos limpos e sorrisos naturais",
            "layout_concept": "Composição split-hero editorial com respiro amplo, cartões de procedimentos com bordas suaves e foco em credibilidade médica.",
            "focal_element": "Bloco de apresentação da equipe clínica com selo de registro profissional e tipografia humanista de alto contraste.",
            "design_critique": "Evitados degradês espalhafatosos e sombras pesadas de templates SaaS genéricos; paleta clara transmite higiene, assepsia e tranquilidade.",
            "copy_tone": "Técnico, acolhedor e focado na saúde e bem-estar preventivo dos pacientes.",
            "hero_title": f"Cuidado odontológico completo e humanizado na {display_name}",
            "hero_desc": f"Tecnologia diagnóstica avançada e ambiente acolhedor para transformar e valorizar o seu sorriso com conforto e segurança.",
            "hero_img": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Clareamento Dental Avançado",
                    "desc": "Procedimento seguro a laser para devolver o brilho e a tonalidade natural dos dentes.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Alinhadores Transparentes",
                    "desc": "Correção ortodôntica moderna com aparelhos invisíveis, removíveis e imperceptíveis.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Check-up Preventivo Completo",
                    "desc": "Avaliação detalhada, limpeza ultrassônica e orientações completas de saúde bucal.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#F8FAFC] text-[#0F172A]",
            "card_bg": "bg-white border-[#E2E8F0] shadow-md",
        }
    elif re.search(
        r"\b(barbe|barba|barbearia|barbeiro|corte|navalha|pampas|homem|cabelo|barber)\b",
        norm,
    ):
        return {
            "niche_key": "barbearia",
            "niche": "Barbearia",
            "rag_niche": "Barbearia & Estilo Masculino",
            "palette_name": "Dourado & Ambar Vintage",
            "vibe": "Vintage, Rústico Premium, Tradicional e Elegante",
            "primary_color": "#D4AF37",
            "secondary_color": "#1E293B",
            "bg_color": "#1C1917",
            "surface_color": "#26221F",
            "border_color": "#38322D",
            "text_color": "#FAFAF9",
            "muted_color": "#A8A29E",
            "theme": "dark",
            "font_heading": "Playfair Display",
            "font_body": "Work Sans",
            "border_radius": "rounded-md",
            "button_style": "shadow",
            "shadow": "shadow-md",
            "photo_style": "Fotografia com iluminação quente, tons ambar, textura de madeira e metais artesanais",
            "layout_concept": "Composição editorial inspirada em alfaiataria e barbearia clássica, com tabela de bancada para serviços e preços alinhados à esquerda.",
            "focal_element": "Quadro de serviços em estilo tabela de barbearia tradicional com filetes em latão (#D4AF37) e serifas de alto contraste.",
            "design_critique": "Substituídos os 3 cartões SaaS arredondados idênticos por uma apresentação estruturada de serviços com preços diretos e bordas sóbrias.",
            "copy_tone": "Direto, sóbrio e focado no ofício de bancada: navalha, tesoura, toalha quente e pontualidade.",
            "hero_title": f"Corte na tesoura e barba na navalha na {display_name}",
            "hero_desc": f"Cadeira com hora marcada, toalha quente e acabamento preciso sem fila de espera.",
            "hero_img": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Corte na Tesoura ou Máquina",
                    "desc": "Lavagem, corte ajustado ao formato do rosto e finalização na bancada.",
                    "price": "R$ 60",
                    "img": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Barba com Toalha Quente",
                    "desc": "Alinhamento na navalha com óleo essencial, espuma aquecida e loção pós-barba.",
                    "price": "R$ 50",
                    "img": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Cabelo e Barba Completos",
                    "desc": "Sessão completa de corte, barba na navalha e acabamento de contorno.",
                    "price": "R$ 100",
                    "img": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#1C1917] text-[#FAFAF9]",
            "card_bg": "bg-[#26221F] border-[#38322D]",
        }
    elif re.search(
        r"\b(estetic|estetica|beleza|salao|hair|unha|unhas|spa|maquiagem|sobrancelha)\b",
        norm,
    ):
        return {
            "niche_key": "estetica",
            "niche": "Estética & Beleza",
            "rag_niche": "Estética & Beleza",
            "palette_name": "Rose & Gold Elegante",
            "vibe": "Sofisticado, Minimalista, Delicado e Relaxante",
            "primary_color": "#EC4899",
            "secondary_color": "#F472B6",
            "bg_color": "#FFF1F2",
            "surface_color": "#FFFFFF",
            "border_color": "#FECDD3",
            "text_color": "#1C1917",
            "muted_color": "#57534E",
            "theme": "light",
            "font_heading": "Cormorant Garamond",
            "font_body": "DM Sans",
            "border_radius": "rounded-2xl",
            "button_style": "shadow",
            "shadow": "shadow-sm",
            "photo_style": "Estética clean, detalhes delicados, tons pastel e iluminação de estúdio profissional",
            "layout_concept": "Layout de ateliê com respiro generoso, tipografia serifada editorial e vitrine assimétrica de protocolos faciais e corporais.",
            "focal_element": "Abertura editorial em duas colunas com retrato luminoso e título em Cormorant Garamond.",
            "design_critique": "Evitado o padrão escuro ou saturado de templates SaaS; adotada superfície luminosa (#FFF1F2 / #FFFFFF) com hierarquia tipográfica suave.",
            "copy_tone": "Acolhedor, claro e objetivo sobre cada protocolo de cuidado facial e corporal.",
            "hero_title": f"Cuidado facial e corporal com hora marcada na {display_name}",
            "hero_desc": f"Protocolos de pele, massoterapia e estética realizados em sessões individuais planejadas para você.",
            "hero_img": "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Limpeza de Pele Profunda",
                    "desc": "Higienização, extração suave e máscara calmante adaptada ao seu tipo de pele.",
                    "price": "R$ 150",
                    "img": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Massagem Relaxante Corporal",
                    "desc": "Sessão manual com óleos vegetais para alívio de tensão muscular e descanso.",
                    "price": "R$ 130",
                    "img": "https://images.unsplash.com/photo-1512290900672-1f4a4340d21a?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Protocolo Facial Revitalizante",
                    "desc": "Hidratação intensiva e estímulo de colágeno com dermocosméticos específicos.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#FFF1F2] text-[#1C1917]",
            "card_bg": "bg-white border-[#FECDD3] shadow-sm",
        }
    elif re.search(
        r"\b(fogao|campeiro|restaurante|gourmet|comida|pizz|pizzaria|hambur|hamburgueria|cafe|doce|carne|churrasco|culinaria|alimento|refeicao|buffet|marmita|prato)\b",
        norm,
    ):
        return {
            "niche_key": "gastronomia",
            "niche": "Gastronomia",
            "rag_niche": "Gastronomia & Alimentação",
            "palette_name": "Gastronômico Vibrante",
            "vibe": "Artesanal, Regional, Apetitoso e Acolhedor",
            "primary_color": "#EAB308",
            "secondary_color": "#DC2626",
            "bg_color": "#1C1917",
            "surface_color": "#292524",
            "border_color": "#44403C",
            "text_color": "#FAFAF9",
            "muted_color": "#D6D3D1",
            "theme": "dark",
            "font_heading": "Fraunces",
            "font_body": "DM Sans",
            "border_radius": "rounded-xl",
            "button_style": "gradient",
            "shadow": "shadow-lg",
            "photo_style": "Fotografia gastronômica detalhada, contraste marcante e elementos artesanais da culinária",
            "layout_concept": "Apresentação inspirada em cardápio de casa de fogo e brasa, combinando fotografia de prato em destaque com seção de especialidades da cozinha e reserva de mesa.",
            "focal_element": "Vitrine gastronômica estilo menu da casa destacando os cortes e pratos com valores claros e reserva direta de mesa.",
            "design_critique": "Eliminados rótulos genéricos de marketing e estrutura SaaS; o layout prioriza os pratos reais, horários da cozinha e reserva de mesa em poucos cliques.",
            "copy_tone": "Sensorial, direto e focado nos ingredientes, ponto de cocção e hospitalidade da mesa.",
            "hero_title": f"Cozinha de brasa e receitas de família no {display_name}",
            "hero_desc": f"Cortes selecionados, acompanhamentos feitos no dia e mesa garantida para você e seus convidados.",
            "hero_img": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Pratos Típicos da Casa",
                    "desc": "Receitas tradicionais preparadas no fogão com ingredientes frescos do dia.",
                    "price": "R$ 48",
                    "img": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Cortes Assados na Brasa",
                    "desc": "Carnes nobres assadas lentamente e servidas no ponto da sua preferência.",
                    "price": "R$ 85",
                    "img": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Reserva de Mesa para Grupos",
                    "desc": "Escolha o horário e a quantidade de lugares antes de sair de casa.",
                    "price": "Sem taxa",
                    "img": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#1C1917] text-[#FAFAF9]",
            "card_bg": "bg-[#292524] border-[#44403C]",
        }
    elif re.search(
        r"\b(pet|petshop|veterinar|veterinaria|veterinario|vet|cao|caes|gato|gatos|animal|animais|banho|tosa)\b",
        norm,
    ):
        return {
            "niche_key": "pet",
            "niche": "Pet & Veterinária",
            "rag_niche": "Petshop & Clínica Veterinária",
            "palette_name": "Laranja Amigável",
            "vibe": "Alegre, Amigável, Vibrante e Confiável",
            "primary_color": "#F97316",
            "secondary_color": "#EA580C",
            "bg_color": "#FAFAF9",
            "surface_color": "#FFFFFF",
            "border_color": "#FED7AA",
            "text_color": "#1C1917",
            "muted_color": "#57534E",
            "theme": "light",
            "font_heading": "Outfit",
            "font_body": "Plus Jakarta Sans",
            "border_radius": "rounded-2xl",
            "button_style": "flat",
            "shadow": "shadow-md",
            "photo_style": "Fotografia espontânea de animais saudáveis, ambiente alegre e colorido",
            "layout_concept": "Layout claro e caloroso com foco em cuidados por porte e pelagem, facilitando o agendamento rápido de banho, tosa e consulta veterinária.",
            "focal_element": "Bloco principal acolhedor com fotografia viva e guia direto de serviços de higiene e saúde animal.",
            "design_critique": "Evitado tema escuro inadequado para clínica e banho pet; utilizado fundo claro (#FAFAF9) com contraste aconchegante e leitura rápida no celular.",
            "copy_tone": "Próximo, cuidadoso e prático para tutores que buscam segurança para cães e gatos.",
            "hero_title": f"Banho, tosa e cuidado veterinário na {display_name}",
            "hero_desc": f"Atendimento tranquilo com hora marcada para cães e gatos, produtos seguros e equipe atenciosa.",
            "hero_img": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Banho e Tosa Higiênica ou na Tesoura",
                    "desc": "Banho morno com secagem silenciosa, corte de unhas e limpeza de ouvidos.",
                    "price": "R$ 70",
                    "img": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Consulta Veterinária e Vacinação",
                    "desc": "Avaliação clínica completa, atualização de vacinas e orientação preventiva.",
                    "price": "R$ 120",
                    "img": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Hidratação e Desembolo de Pelagem",
                    "desc": "Cuidado específico para pelos longos ou sensíveis com escovação delicada.",
                    "price": "R$ 90",
                    "img": "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#FAFAF9] text-[#1C1917]",
            "card_bg": "bg-white border-[#FED7AA] shadow-sm",
        }
    else:
        return {
            "niche_key": "servicos",
            "niche": "Serviços Especializados",
            "rag_niche": "Serviços Gerais & Tecnologia",
            "palette_name": "Indigo Tech Moderno",
            "vibe": "Moderno, Tecnológico, Dinâmico e Profissional",
            "primary_color": "#6366F1",
            "secondary_color": "#4F46E5",
            "bg_color": "#0F172A",
            "surface_color": "#1E293B",
            "border_color": "#334155",
            "text_color": "#F8FAFC",
            "muted_color": "#94A3B8",
            "theme": "dark",
            "font_heading": "Space Grotesk",
            "font_body": "Plus Jakarta Sans",
            "border_radius": "rounded-xl",
            "button_style": "flat",
            "shadow": "shadow-sm",
            "photo_style": "Interface vetorial minimalista, ícones limpos e estética digital de alta precisão",
            "layout_concept": "Grade assimétrica objetiva com foco em serviços sob hora marcada, endereço e canais diretos de atendimento.",
            "focal_element": "Painel tipográfico de abertura com chamada direta para reserva de horário online.",
            "design_critique": "Removidos jargões genéricos de IA e decorações supérfluas; foco em clareza de escopo, horários e reserva.",
            "copy_tone": "Objetivo, claro e orientado à ação do cliente.",
            "hero_title": f"Atendimento com hora marcada na {display_name}",
            "hero_desc": f"Escolha o serviço e reserve o melhor dia e horário diretamente pelo navegador.",
            "hero_img": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Atendimento Individual",
                    "desc": "Sessão dedicada com horário reservado exclusivamente para a sua demanda.",
                    "price": "Sob consulta",
                    "img": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Avaliação e Diagnóstico",
                    "desc": "Análise técnica detalhada com apresentação de etapas e prazos claros.",
                    "price": "Sob consulta",
                    "img": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Agendamento Online Direto",
                    "desc": "Seleção imediata de data e horário disponível com confirmação automática.",
                    "price": "Online",
                    "img": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#0F172A] text-[#F8FAFC]",
            "card_bg": "bg-[#1E293B] border-[#334155] shadow-lg",
        }
