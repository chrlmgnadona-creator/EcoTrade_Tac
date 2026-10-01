#include <cstdlib>
#include "crow.h"
#include "crow/middlewares/cors.h"
#include "Database.hpp"
#include "HashUtils.hpp"
#include <chrono>
#include <fstream>
#include <sstream>

// Helper function to load frontend files safely
std::string readHtmlFile(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        return "<!DOCTYPE html><html><body><h1>404 - Frontend File Not Found</h1><p>Make sure Frontend/index.html exists relative to the server execution path.</p></body></html>";
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

int main() {
    crow::App<crow::CORSHandler> app;

    // Enable CORS for browser frontend integration
    auto& cors = app.get_middleware<crow::CORSHandler>();
    cors.global()
        .headers("X-Requested-With", "Content-Type", "Accept", "Authorization")
        .methods(crow::HTTPMethod::GET, crow::HTTPMethod::POST, crow::HTTPMethod::DELETE, crow::HTTPMethod::OPTIONS)
        .origin("*");

    Database db("Database/database.db");

    // --- FRONTEND ROOT ROUTE ---
    CROW_ROUTE(app, "/")([](){
        // Serves your index.html file when visiting the base URL
        auto page = readHtmlFile("Frontend/index.html");
        return crow::response(200, page);
    });

    // --- AUTHENTICATION ROUTES ---
    CROW_ROUTE(app, "/api/auth/register").methods(crow::HTTPMethod::POST)([&db](const crow::request& req) {
        try {
            auto body = json::parse(req.body);
            std::string email = body["email"];
            std::string rawPassword = body["password"];
            std::string name = body["name"];
            std::string barangay = body["barangay"];

            if (!db.getUserByEmail(email).is_null()) {
                return crow::response(400, "{\"error\": \"Email is already registered.\"}");
            }

            std::string userId = "user-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
            
            json newUser;
            newUser["id"] = userId;
            newUser["name"] = name;
            newUser["email"] = email;
            newUser["password_hash"] = HashUtils::sha256(rawPassword);
            newUser["barangay"] = barangay;

            if (db.registerUser(newUser)) {
                json responseData;
                responseData["message"] = "Registration successful";
                responseData["token"] = "tacloban_token_" + HashUtils::sha256(userId);
                responseData["user"] = {
                    {"id", userId},
                    {"name", name},
                    {"email", email},
                    {"barangay", barangay}
                };
                return crow::response(201, responseData.dump());
            } else {
                return crow::response(500, "{\"error\": \"Failed to register user.\"}");
            }
        } catch (...) {
            return crow::response(400, "{\"error\": \"Invalid JSON request body.\"}");
        }
    });

    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)([&db](const crow::request& req) {
        try {
            auto body = json::parse(req.body);
            std::string email = body["email"];
            std::string rawPassword = body["password"];

            json user = db.getUserByEmail(email);
            if (user.is_null()) {
                return crow::response(401, "{\"error\": \"Invalid email or password.\"}");
            }

            if (HashUtils::sha256(rawPassword) != user["password_hash"].get<std::string>()) {
                return crow::response(401, "{\"error\": \"Invalid email or password.\"}");
            }

            json responseData;
            responseData["message"] = "Login successful";
            responseData["token"] = "tacloban_token_" + HashUtils::sha256(user["id"].get<std::string>());
            responseData["user"] = {
                {"id", user["id"]},
                {"name", user["name"]},
                {"email", user["email"]},
                {"barangay", user["barangay"]}
            };
            return crow::response(200, responseData.dump());
        } catch (...) {
            return crow::response(400, "{\"error\": \"Invalid JSON request body.\"}");
        }
    });

    // --- MATERIALS ROUTES ---
    CROW_ROUTE(app, "/api/materials").methods(crow::HTTPMethod::GET)([&db]() {
        return crow::response(200, db.getAllMaterials().dump());
    });

    CROW_ROUTE(app, "/api/materials").methods(crow::HTTPMethod::POST)([&db](const crow::request& req) {
        try {
            auto body = json::parse(req.body);
            if (db.addMaterial(body)) {
                return crow::response(201, "{\"message\": \"Material listing created successfully\"}");
            }
            return crow::response(500, "{\"error\": \"Failed to save material to database\"}");
        } catch (...) {
            return crow::response(400, "{\"error\": \"Invalid JSON payload\"}");
        }
    });

    CROW_ROUTE(app, "/api/materials/<string>").methods(crow::HTTPMethod::DELETE)([&db](std::string id) {
        if (db.deleteMaterial(id)) {
            return crow::response(200, "{\"message\": \"Item deleted successfully\"}");
        }
        return crow::response(404, "{\"error\": \"Item not found or could not be deleted\"}");
    });

    // --- REQUESTS ROUTES ---
    CROW_ROUTE(app, "/api/requests").methods(crow::HTTPMethod::GET)([&db]() {
        return crow::response(200, db.getAllRequests().dump());
    });

    CROW_ROUTE(app, "/api/requests").methods(crow::HTTPMethod::POST)([&db](const crow::request& req) {
        try {
            auto body = json::parse(req.body);
            if (db.addRequest(body)) {
                return crow::response(201, "{\"message\": \"Request sent successfully\"}");
            }
            return crow::response(500, "{\"error\": \"Failed to process request\"}");
        } catch (...) {
            return crow::response(400, "{\"error\": \"Invalid JSON payload\"}");
        }
    });

    const char* portEnv = std::getenv("PORT");
    int port = portEnv ? std::stoi(portEnv) : 8080;

    std::cout << "==============================================" << std::endl;
    std::cout << "EcoTrade Tacloban Reusable Materials REST API" << std::endl;
    std::cout << "Server running on port: " << port << std::endl;
    std::cout << "==============================================" << std::endl;

    app.port(port).multithreaded().run();
}