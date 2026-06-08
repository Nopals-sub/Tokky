import tiktoken

# Model context window limits
MODEL_LIMITS = {
    "Universal (Safe Range)": 128000,
    "cl100k_base": 128000,
    "o200k_base": 128000,
    "p50k_base": 16385,
    "r50k_base": 8192,
}

# Average tokens per image for Vision models (conservative estimate)
IMAGE_TOKEN_COST = 1000 

def get_universal_range(text, image_count=0):
    """Returns (min_tokens, max_tokens) based on character heuristics and images."""
    chars = len(text)
    # 1 token is roughly 2.5 to 5.5 characters
    min_tokens = int(chars / 5.5) + (image_count * 700)
    max_tokens = int(chars / 2.5) + (image_count * 1200)
    return min_tokens, max_tokens

def count_bpe_tokens(text, encoding_name):
    encoding = tiktoken.get_encoding(encoding_name)
    return len(encoding.encode(text))

def get_token_count(text, image_count, provider, model):
    """Returns (min, max) tokens including image costs."""
    if not text and image_count == 0:
        return 0, 0
    
    if provider == "Universal Mode":
        return get_universal_range(text, image_count)
    
    # Text tokens
    text_tokens = 0
    if provider == "BPE":
        text_tokens = count_bpe_tokens(text, model)
    
    # Image tokens (Vision models)
    image_tokens = image_count * IMAGE_TOKEN_COST
    
    total = text_tokens + image_tokens
    return total, total
