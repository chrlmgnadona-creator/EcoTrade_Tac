cmake_minimum_required(VERSION 3.14)
project(EcoTradeBackend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

# 1. Fetch Crow Framework
FetchContent_Declare(
    crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG v1.0+5
)
FetchContent_MakeAvailable(crow)

# 2. Fetch nlohmann_json
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz
)
FetchContent_MakeAvailable(json)

# 3. Find System SQLite3 & OpenSSL
find_package(SQLite3 REQUIRED)
find_package(OpenSSL REQUIRED)

add_executable(ecotrade_server main.cpp)

target_link_libraries(ecotrade_server PRIVATE
    Crow::Crow
    nlohmann_json::nlohmann_json
    SQLite::SQLite3
    OpenSSL::SSL
    OpenSSL::Crypto
)