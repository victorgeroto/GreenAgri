@echo off
set JAVA_HOME=C:\Users\Victor\.jdk\jdk-17.0.16
set PATH=%JAVA_HOME%\bin;%PATH%
echo Using Java from: %JAVA_HOME%
java -version
echo.
echo Starting Spring Boot application...
mvnw.cmd spring-boot:run
