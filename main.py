import asyncio
import uvicorn
from fastapi import FastAPI

app = FastAPI()

# add status codes and proper response and error handling
@app.get("/health", status_code=200)    
def root():  
    try:
        return {"message": "Hello World", "status": 200}
    except Exception as e:
        return {"message": "Internal Server Error", "error": str(e), "status": 500}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
