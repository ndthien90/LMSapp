@echo off
:: Khởi động server HTTP của Python trong một cửa sổ mới và chạy ngầm
start "" python -m http.server

:: Đợi vài giây để server khởi động
timeout /t 1 > nul

:: Mở địa chỉ localhost:8000 trong trình duyệt mặc định
start http://localhost:8000/LMS_App10.html


