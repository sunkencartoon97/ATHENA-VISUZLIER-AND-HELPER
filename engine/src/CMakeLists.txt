cmake_minimum_required(VERSION 3.16)
project(athena_engine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# nlohmann/json single header lives in engine/include/
include_directories(${CMAKE_SOURCE_DIR}/../include)

add_executable(athena_engine ${CMAKE_SOURCE_DIR}/main.cpp)

# Output binary into build/bin/ so backend/config.py finds it
set_target_properties(athena_engine PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

target_compile_options(athena_engine PRIVATE -O2 -Wall -Wextra -Wno-unused-parameter)
