from anthropic import Anthropic
client = Anthropic(api_key="60b19768f0334766a3e3259590b14460.QTFX9bVQYgALL0Mj", base_url="https://api.z.ai/api/anthropic")
resp = client.messages.create(
    model="glm-4.5",
    max_tokens=4096,
    messages=[
        {"role": "user", "content": "Hello, how are you?"}
    ]
)
print(resp)