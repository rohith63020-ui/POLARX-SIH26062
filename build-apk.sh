#!/bin/bash

# POLARX Android APK Module Build & Sync Script
echo "=========================================="
echo "   POLARX Android APK Module Generator   "
echo "=========================================="

echo "[1/3] Building production web assets..."
npm run build

echo "[2/3] Syncing Capacitor Android Native Project..."
npx cap sync android

echo "[3/3] Checking Gradle environment..."
if command -v java &> /dev/null && [ -d "$ANDROID_HOME" ]; then
    echo "Android SDK and Java environment detected! Compiling APK..."
    chmod +x android/gradlew
    cd android && ./gradlew assembleDebug
    echo "=========================================="
    echo " SUCCESS: Debug APK generated at:"
    echo " android/app/build/outputs/apk/debug/app-debug.apk"
    echo "=========================================="
else
    echo "=========================================="
    echo " Android Capacitor Module Ready!"
    echo " Native Code & Web Bundle synced in /android"
    echo ""
    echo " To compile the APK on your system:"
    echo " 1. Open Android Studio -> Open project -> Select the '/android' folder"
    echo " 2. Click Build -> Build Bundle(s) / APK(s) -> Build APK(s)"
    echo " 3. Or run in terminal: cd android && ./gradlew assembleDebug"
    echo "=========================================="
fi
