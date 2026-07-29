@echo off
:: ============================================================
::  Yamato Backend - Auto Startup Script
::  FastAPI server using the project's venv
:: ============================================================

set VENV_PYTHON=C:\Users\intern_krishna.soni\Desktop\Yamato-Asset\.venv\Scripts\python.exe
set SERVER_DIR=C:\Users\intern_krishna.soni\Desktop\Yamato-Asset\Backend\python

cd /d "%SERVER_DIR%"
"%VENV_PYTHON%" -m uvicorn main:app --reload
