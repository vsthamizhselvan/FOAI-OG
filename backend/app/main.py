"""
AERON — Counterfactual AI Flight Planner
FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="AERON AI Flight Planner API",
    description="Backend API for AERON: Autonomous Aerial Vehicle Counterfactual Simulation & AO* Planning",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "project": "AERON: Counterfactual AI Flight Planner",
        "description": "AI That Imagines Before It Acts",
        "docs_url": "/docs",
        "api_health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
