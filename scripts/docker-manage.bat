@echo off
REM Docker Management Script for MCP Code Validator (Windows Batch)
REM This batch file calls the PowerShell script

powershell.exe -ExecutionPolicy Bypass -File "%~dp0docker-manage.ps1" %*