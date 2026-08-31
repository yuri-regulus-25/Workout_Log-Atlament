import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use(localProperties::load)
}

fun signingValue(envName: String, propertyName: String): String? =
    System.getenv(envName)?.takeIf { it.isNotBlank() }
        ?: localProperties.getProperty(propertyName)?.takeIf { it.isNotBlank() }

val releaseStoreFile = signingValue("ATLAMENT_RELEASE_STORE_FILE", "atlament.release.storeFile")
    ?: "app/signing/atlament-release.jks"
val releaseStorePassword = signingValue("ATLAMENT_RELEASE_STORE_PASSWORD", "atlament.release.storePassword")
val releaseKeyAlias = signingValue("ATLAMENT_RELEASE_KEY_ALIAS", "atlament.release.keyAlias") ?: "atlament"
val releaseKeyPassword = signingValue("ATLAMENT_RELEASE_KEY_PASSWORD", "atlament.release.keyPassword")
val releaseSigningReady = releaseStorePassword != null && releaseKeyPassword != null

android {
    namespace = "jp.yuri_regulus_25.atlament"
    compileSdk = 35

    defaultConfig {
        applicationId = "jp.yuri_regulus_25.atlament"
        minSdk = 29
        targetSdk = 35
        versionCode = 4
        versionName = "2.0.0"
    }

    signingConfigs {
        create("release") {
            storeFile = rootProject.file(releaseStoreFile)
            storePassword = releaseStorePassword
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.matching { task -> task.name == "packageRelease" || task.name == "validateSigningRelease" }.configureEach {
    doFirst {
        if (!releaseSigningReady) {
            throw GradleException(
                "Release signing credentials are missing. Set ATLAMENT_RELEASE_STORE_PASSWORD and ATLAMENT_RELEASE_KEY_PASSWORD, " +
                    "or put atlament.release.storePassword and atlament.release.keyPassword in src/application/android/local.properties."
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    testImplementation(kotlin("test"))
}
