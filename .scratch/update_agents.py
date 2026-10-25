with open('ai_software_factory/agents.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update requirements_analyst_node
old_block1 = """    if isinstance(result, ClientConfig):
        parsed_dict = result.model_dump()
        log_msg = "[RequirementsAnalyst] Design Direction (Passe 1) sintetizada com sucesso via LLM Gateway."
    elif isinstance(result, dict):
        parsed_dict = result
        log_msg = "[RequirementsAnalyst] Design Direction (Passe 1) sintetizada via LLM Gateway."
    else:
        parsed_dict = fallback_action()
        log_msg = "[RequirementsAnalyst] Design Direction estruturada via Fallback determinístico seguro."

    custom_reqs = _merge_with_fallback_direction(parsed_dict, lead_raw)
    template = state.get("template_path") or "gold_templates/template_base_app"

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(log_msg)

    return {
        "customization_requirements": custom_reqs,
        "template_path": template,
        "execution_logs": current_logs,
    }"""

new_block1 = """    provedor_analyst = llm_gateway.get_last_execution_provider()
    if isinstance(result, ClientConfig):
        parsed_dict = result.model_dump()
        log_msg = f"[RequirementsAnalyst] Design Direction (Passe 1) sintetizada com sucesso via {provedor_analyst}."
    elif isinstance(result, dict):
        parsed_dict = result
        log_msg = f"[RequirementsAnalyst] Design Direction (Passe 1) sintetizada via {provedor_analyst}."
    else:
        parsed_dict = fallback_action()
        log_msg = f"[RequirementsAnalyst] Design Direction estruturada via fallback ({provedor_analyst})."

    custom_reqs = _merge_with_fallback_direction(parsed_dict, lead_raw)
    template = state.get("template_path") or "gold_templates/template_base_app"

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(log_msg)

    return {
        "customization_requirements": custom_reqs,
        "template_path": template,
        "execution_logs": current_logs,
        "provedor_execucao": provedor_analyst,
    }"""

# 2. Update code_injector_node
old_block2 = """    current_logs.append(
        "[CodeInjector] Design Direction injetada em ai_config.json, index.html, index.css e LandingPage.jsx gerada com a skill frontend-design."
    )

    return {"execution_logs": current_logs}"""

new_block2 = """    provedor_code = llm_gateway.get_last_execution_provider()
    current_logs.append(
        f"[CodeInjector] Design Direction e LandingPage.jsx geradas com sucesso via provedor '{provedor_code}'."
    )

    return {"execution_logs": current_logs, "provedor_execucao": provedor_code}"""

assert old_block1 in content, "old_block1 not found"
assert old_block2 in content, "old_block2 not found"

content = content.replace(old_block1, new_block1).replace(old_block2, new_block2)

with open('ai_software_factory/agents.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("agents.py updated successfully!")
