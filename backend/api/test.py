from google import genai
from dotenv import load_dotenv

# โหลด API Key จาก .env
load_dotenv()

# สร้าง Client
client = genai.Client()

print("กำลังทดสอบเรียก API...")

try:
    # ลองยิงคำถามง่ายๆ
    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        contents='Test API: ขอคำตอบสั้นๆ ว่า "ระบบปกติ" หากคุณได้รับข้อความนี้'
    )
    print("✅ สำเร็จ! API ตอบกลับมาว่า:", response.text)

except Exception as e:
    print("❌ API ยังติดปัญหาอยู่! สาเหตุ:", str(e))