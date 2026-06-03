@echo off
setlocal EnableDelayedExpansion

echo ==========================================================
echo   Scaffolding Feature-Sliced Architecture for MsuTracker
echo ==========================================================
echo.

REM Ensure we are in the project root by checking for package.json
if not exist "package.json" (
  echo ERROR: package.json not found.
  echo Please run this script from the root directory of your React Native app.
  exit /b 1
)

echo [1/4] Setting up Core infrastructure...
if not exist "src\core\database" mkdir "src\core\database"
if not exist "src\core\navigation" mkdir "src\core\navigation"

echo [2/4] Setting up Schedule Feature domain...
if not exist "src\features\schedule\models" mkdir "src\features\schedule\models"
if not exist "src\features\schedule\repositories" mkdir "src\features\schedule\repositories"
if not exist "src\features\schedule\components" mkdir "src\features\schedule\components"
if not exist "src\features\schedule\screens" mkdir "src\features\schedule\screens"

echo [3/4] Setting up Finance Feature domain...
if not exist "src\features\finance\models" mkdir "src\features\finance\models"
if not exist "src\features\finance\repositories" mkdir "src\features\finance\repositories"
if not exist "src\features\finance\components" mkdir "src\features\finance\components"
if not exist "src\features\finance\screens" mkdir "src\features\finance\screens"

echo [4/4] Setting up Scanner domain and Shared resources...
if not exist "src\features\scanner\components" mkdir "src\features\scanner\components"
if not exist "src\features\scanner\screens" mkdir "src\features\scanner\screens"
if not exist "src\features\scanner\utils" mkdir "src\features\scanner\utils"

if not exist "src\shared\components" mkdir "src\shared\components"
if not exist "src\shared\tokens" mkdir "src\shared\tokens"

echo.
echo Writing base WatermelonDB schema file...
>src\core\database\schema.ts (
  echo import { appSchema, tableSchema } from '@nozbe/watermelondb'^;
  echo.
  echo export default appSchema^(^{
  echo   version: 1,
  echo   tables: [
  echo     tableSchema^(^{
  echo       name: 'subjects',
  echo       columns: [
  echo         { name: 'code', type: 'string' },
  echo         { name: 'description', type: 'string' },
  echo         { name: 'units', type: 'number' },
  echo       ]
  echo     ^}^),
  echo     tableSchema^(^{
  echo       name: 'schedule_slots',
  echo       columns: [
  echo         { name: 'subject_id', type: 'string', isIndexed: true },
  echo         { name: 'day_of_week', type: 'string' },
  echo         { name: 'start_time', type: 'string' },
  echo         { name: 'end_time', type: 'string' },
  echo         { name: 'room', type: 'string' },
  echo       ]
  echo     ^}^),
  echo     tableSchema^(^{
  echo       name: 'payment_dues',
  echo       columns: [
  echo         { name: 'title', type: 'string' },
  echo         { name: 'amount', type: 'number' },
  echo         { name: 'is_paid', type: 'boolean' },
  echo         { name: 'due_date', type: 'number', isOptional: true },
  echo         { name: 'receipt_image_uri', type: 'string', isOptional: true },
  echo       ]
  echo     ^}^)
  echo   ]
  echo ^}^)^;
)

echo.
echo Migration cleanup: Moving original tokens if they exist...
if exist "src\tokens\*.*" (
  copy "src\tokens\*.*" "src\shared\tokens\" >nul
  echo   - Copied tokens to src\shared\tokens
)

echo.
echo ==========================================================
echo Done! Folder structure created successfully.
echo ==========================================================
endlocal
exit /b 0