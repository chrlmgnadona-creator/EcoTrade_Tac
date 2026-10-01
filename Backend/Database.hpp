#pragma once
#include <sqlite3.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <string>

using json = nlohmann::json;

class Database {
private:
    sqlite3* db;

public:
    Database(const std::string& dbPath) {
        if (sqlite3_open(dbPath.c_str(), &db) != SQLITE_OK) {
            std::cerr << "Failed to open SQLite database: " << sqlite3_errmsg(db) << std::endl;
        } else {
            std::cout << "Connected to SQLite Database (" << dbPath << ") successfully." << std::endl;
            execQuery("PRAGMA foreign_keys = ON;");
        }
    }

    ~Database() {
        sqlite3_close(db);
    }

    bool execQuery(const std::string& sql) {
        char* errMessage = nullptr;
        int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMessage);
        if (rc != SQLITE_OK) {
            std::cerr << "SQL execution error: " << errMessage << std::endl;
            sqlite3_free(errMessage);
            return false;
        }
        return true;
    }

    // --- AUTHENTICATION ---
    bool registerUser(const json& u) {
        std::string sql = "INSERT INTO users (id, name, email, password_hash, barangay) VALUES (?, ?, ?, ?, ?);";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, u["id"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 2, u["name"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 3, u["email"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 4, u["password_hash"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 5, u["barangay"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);

            int rc = sqlite3_step(stmt);
            sqlite3_finalize(stmt);
            return rc == SQLITE_DONE;
        }
        return false;
    }

    json getUserByEmail(const std::string& email) {
        std::string sql = "SELECT id, name, email, password_hash, barangay FROM users WHERE email = ?;";
        sqlite3_stmt* stmt;
        json user = nullptr;

        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, email.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(stmt) == SQLITE_ROW) {
                user = json::object();
                user["id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
                user["name"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
                user["email"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
                user["password_hash"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
                user["barangay"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            }
        }
        sqlite3_finalize(stmt);
        return user;
    }

    // --- MATERIALS ---
    json getAllMaterials() {
        json result = json::array();
        std::string sql = "SELECT id, title, category, type, price, quantity, description, barangay, owner_name, owner_contact, owner_id, image_url, date_posted FROM materials ORDER BY date_posted DESC;";
        
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                json item;
                item["id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
                item["title"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
                item["category"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
                item["type"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
                item["price"] = sqlite3_column_double(stmt, 4);
                item["quantity"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
                item["description"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
                item["barangay"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
                item["ownerName"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8));
                item["ownerContact"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9));
                item["ownerId"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10));
                item["imageUrl"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 11));
                item["datePosted"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 12));
                result.push_back(item);
            }
        }
        sqlite3_finalize(stmt);
        return result;
    }

    bool addMaterial(const json& item) {
        std::string sql = "INSERT INTO materials (id, title, category, type, price, quantity, description, barangay, owner_name, owner_contact, owner_id, image_url, date_posted) "
                          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, item["id"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 2, item["title"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 3, item["category"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 4, item["type"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_double(stmt, 5, item["price"].get<double>());
            sqlite3_bind_text(stmt, 6, item["quantity"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 7, item["description"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 8, item["barangay"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 9, item["ownerName"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 10, item["ownerContact"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 11, item["ownerId"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 12, item["imageUrl"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 13, item["datePosted"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);

            int rc = sqlite3_step(stmt);
            sqlite3_finalize(stmt);
            return rc == SQLITE_DONE;
        }
        return false;
    }

    bool deleteMaterial(const std::string& id) {
        std::string sql = "DELETE FROM materials WHERE id = ?;";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_TRANSIENT);
            int rc = sqlite3_step(stmt);
            sqlite3_finalize(stmt);
            return rc == SQLITE_DONE;
        }
        return false;
    }

    // --- REQUESTS ---
    json getAllRequests() {
        json result = json::array();
        std::string sql = "SELECT id, item_id, item_title, requester_name, requester_contact, message, date_sent, status FROM requests ORDER BY date_sent DESC;";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                json req;
                req["id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
                req["itemId"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
                req["itemTitle"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
                req["requesterName"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
                req["requesterContact"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
                req["message"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
                req["dateSent"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
                req["status"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
                result.push_back(req);
            }
        }
        sqlite3_finalize(stmt);
        return result;
    }

    bool addRequest(const json& req) {
        std::string sql = "INSERT INTO requests (id, item_id, item_title, requester_name, requester_contact, message, date_sent, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);";
        sqlite3_stmt* stmt;
        if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, req["id"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 2, req["itemId"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 3, req["itemTitle"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 4, req["requesterName"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 5, req["requesterContact"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 6, req["message"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 7, req["dateSent"].get<std::string>().c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 8, "Pending", -1, SQLITE_TRANSIENT);

            int rc = sqlite3_step(stmt);
            sqlite3_finalize(stmt);
            return rc == SQLITE_DONE;
        }
        return false;
    }
};