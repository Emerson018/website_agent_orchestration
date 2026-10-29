"""
Shim de compatibilidade retroativa para imports legados de `rag_pipeline`.
O módulo canônico agora é `ai_software_factory.brand_analyzer`.
"""
from ai_software_factory.brand_analyzer import (
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
    build_brand_design_spec,
    collect_contact_briefing,
    download_and_extract_file,
    extract_brand_direction,
    extract_branding_from_report,
    extract_text_from_image,
    extract_text_from_pdf,
    extract_text_from_url,
    generate_brand_direction_report,
    generate_fallback_brand_report,
    generate_fallback_rag_report,
    generate_rag_report,
    get_supabase,
    render_brand_direction_dossier,
    render_design_direction_report,
    run_brand_analysis_pipeline,
    run_rag_analysis_pipeline,
)

__all__ = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "get_supabase",
    "extract_text_from_url",
    "extract_text_from_pdf",
    "extract_text_from_image",
    "download_and_extract_file",
    "collect_contact_briefing",
    "build_brand_design_spec",
    "render_design_direction_report",
    "render_brand_direction_dossier",
    "generate_brand_direction_report",
    "generate_rag_report",
    "generate_fallback_brand_report",
    "generate_fallback_rag_report",
    "extract_branding_from_report",
    "extract_brand_direction",
    "run_brand_analysis_pipeline",
    "run_rag_analysis_pipeline",
]
