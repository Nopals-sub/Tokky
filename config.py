PROVIDERS = ["Universal Mode", "BPE"]

MODELS = {
    "Universal Mode": ["Universal (Safe Range)"],
    "BPE": ["cl100k_base", "o200k_base", "p50k_base", "r50k_base"],
}

ALLOWED_EXTENSIONS = [
    "pdf", "pptx", "txt", "md", "html", "htm", "json", "csv", "xml", "yaml", "yml",
    "py", "js", "ts", "jsx", "tsx", "c", "cpp", "h", "hpp", "java", "go", "rb", "php", "sql",
    "png", "jpg", "jpeg", "webp",
]

ROLE_LABELS = {
    "user": "User",
    "assistant": "Assistant (AI)",
}
