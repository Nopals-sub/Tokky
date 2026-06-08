from extractor import extract_content
from counter import get_token_count, MODEL_LIMITS


def _format_token_range(t_min, t_max):
    if t_min == t_max:
        return f"{t_min:,}"
    return f"{t_min:,} - {t_max:,}"


def _usage_info(total_min, total_max, model):
    context_limit = MODEL_LIMITS.get(model, 128000)
    usage_pct = (total_max / context_limit) * 100 if context_limit else 0
    warning = None
    if total_max > context_limit:
        warning = "exceed"
    elif usage_pct > 80:
        warning = "approach"
    return {
        "context_limit": context_limit,
        "usage_pct": round(usage_pct, 2),
        "warning": warning,
    }


def analyze_files(file_list, provider, model):
    """Analyze a list of (filename, bytes) tuples."""
    rows = []
    total_min = 0
    total_max = 0

    for filename, file_bytes in file_list:
        text, img_count = extract_content(filename, file_bytes)
        t_min, t_max = get_token_count(text, img_count, provider, model)
        total_min += t_min
        total_max += t_max

        rows.append({
            "file_name": filename,
            "type": filename.rsplit(".", 1)[-1].upper() if "." in filename else "—",
            "images": img_count,
            "words": len(text.split()) if text else 0,
            "tokens": _format_token_range(t_min, t_max),
            "t_min": t_min,
            "t_max": t_max,
        })

    usage = _usage_info(total_min, total_max, model)
    return {
        "rows": rows,
        "total_min": total_min,
        "total_max": total_max,
        "total_display": _format_token_range(total_min, total_max),
        "model": model,
        "provider": provider,
        **usage,
    }


def analyze_conversation(messages, provider, model):
    """
    Analyze a simulated conversation.
    Each message: {role: 'user'|'assistant', text: str, files: [(filename, bytes), ...]}
    """
    rows = []
    total_min = 0
    total_max = 0
    combined_text_parts = []

    for i, msg in enumerate(messages, start=1):
        role = msg.get("role", "user")
        text = msg.get("text", "") or ""
        files = msg.get("files", [])

        msg_text = text
        msg_images = 0
        file_names = []

        for filename, file_bytes in files:
            file_text, img_count = extract_content(filename, file_bytes)
            msg_text += "\n" + file_text if file_text else ""
            msg_images += img_count
            file_names.append(filename)

        role_prefix = f"[{role}]\n"
        countable_text = role_prefix + msg_text if msg_text.strip() else role_prefix.strip()
        combined_text_parts.append(countable_text)

        t_min, t_max = get_token_count(countable_text, msg_images, provider, model)
        total_min += t_min
        total_max += t_max

        rows.append({
            "index": i,
            "role": role,
            "role_label": "User" if role == "user" else "AI",
            "text_preview": (text[:120] + "…") if len(text) > 120 else text,
            "files": file_names,
            "images": msg_images,
            "words": len(msg_text.split()) if msg_text else 0,
            "tokens": _format_token_range(t_min, t_max),
            "t_min": t_min,
            "t_max": t_max,
        })

    usage = _usage_info(total_min, total_max, model)
    return {
        "rows": rows,
        "message_count": len(messages),
        "total_min": total_min,
        "total_max": total_max,
        "total_display": _format_token_range(total_min, total_max),
        "model": model,
        "provider": provider,
        **usage,
    }
