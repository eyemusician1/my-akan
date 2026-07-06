# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Preserve widget handler and related classes
-keep class com.Trakn.** { *; }
-keep class com.reactnativeandroidwidget.** { *; }
-keepclassmembers class com.Trakn.** { *; }

# Preserve React Native and Android widget components
-keep interface react.** { *; }
-keep class react.** { *; }
-keepclassmembers class react.** { *; }

# Preserve enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
