#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class MIR4APITester:
    def __init__(self, base_url="https://demobackend.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({
                "test": test_name,
                "details": details
            })
            print(f"❌ {test_name} - FAILED: {details}")
    
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                return True, response.json() if response.status_code != 204 else {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text}")
                return False, {}
                
        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout (30s)")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error - backend may be down")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test basic API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)
    
    def test_get_boss_prices(self):
        """Test getting boss prices"""
        success, response = self.run_test("Get Boss Prices", "GET", "boss-prices", 200)
        
        if success:
            required_fields = [
                "medio2_price", "grande2_price", "medio4_price", "grande4_price", 
                "medio6_price", "grande6_price", "medio7_price", "grande7_price", 
                "medio8_price", "grande8_price", "xama_price", "praca_4f_price", 
                "cracha_epica_price", "gold_price"
            ]
            
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Boss Prices Structure", False, f"Missing fields: {missing_fields}")
                return False, response
            else:
                self.log_test("Boss Prices Structure", True)
                return True, response
        
        return success, response
    
    def test_update_boss_prices(self):
        """Test updating boss prices"""
        test_data = {
            "medio2_price": 0.05,
            "grande2_price": 0.10,
            "gold_price": 0.001
        }
        
        success, response = self.run_test("Update Boss Prices", "PUT", "boss-prices", 200, test_data)
        
        if success:
            # Verify the updated values
            if response.get("medio2_price") == 0.05 and response.get("grande2_price") == 0.10:
                self.log_test("Boss Prices Update Verification", True)
            else:
                self.log_test("Boss Prices Update Verification", False, "Values not updated correctly")
        
        return success, response
    
    def test_get_accounts_empty(self):
        """Test getting accounts (should work even if empty)"""
        success, response = self.run_test("Get Accounts", "GET", "accounts", 200)
        
        if success:
            if isinstance(response, list):
                self.log_test("Accounts Response Type", True)
            else:
                self.log_test("Accounts Response Type", False, "Response is not a list")
        
        return success, response
    
    def test_create_account(self):
        """Test creating a new account"""
        account_data = {
            "name": "Teste Account",
            "bosses": {
                "medio2": 10, "grande2": 5, "medio4": 8, "grande4": 3,
                "medio6": 2, "grande6": 1, "medio7": 0, "grande7": 0,
                "medio8": 0, "grande8": 0
            },
            "sala_pico": "5F",
            "special_bosses": {
                "xama": 1, "praca_4f": 0, "cracha_epica": 0
            },
            "materials": {
                "aco": {"raro": 10, "epico": 5, "lendario": 2},
                "esfera": {"raro": 8, "epico": 3, "lendario": 1},
                "lunar": {"raro": 12, "epico": 4, "lendario": 0},
                "quintessencia": {"raro": 0, "epico": 0, "lendario": 0},
                "bugiganga": {"raro": 0, "epico": 0, "lendario": 0},
                "platina": {"raro": 0, "epico": 0, "lendario": 0},
                "iluminado": {"raro": 0, "epico": 0, "lendario": 0},
                "anima": {"raro": 0, "epico": 0, "lendario": 0}
            },
            "craft_resources": {
                "po": 1000, "ds": 5000, "cobre": 50000
            },
            "craft_items": ["garra", "escama"],
            "account_info": {
                "level": 85, "power": 1500000,
                "praca": "6F", "praca_atq": "5F", "pico": "7F",
                "raid": "Mina Demoníaca", "raid_boss": "Rei do Touro"
            },
            "gold": 125000.50
        }
        
        success, response = self.run_test("Create Account", "POST", "accounts", 200, account_data)
        
        if success:
            account_id = response.get("id")
            if account_id:
                self.log_test("Account ID Generation", True)
                # Verify account structure
                required_fields = ["name", "bosses", "special_bosses", "materials", "craft_resources", "account_info"]
                missing_fields = [field for field in required_fields if field not in response]
                if missing_fields:
                    self.log_test("Created Account Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Created Account Structure", True)
                
                return success, account_id
            else:
                self.log_test("Account ID Generation", False, "No ID in response")
        
        return success, None
    
    def test_get_specific_account(self, account_id):
        """Test getting a specific account by ID"""
        if not account_id:
            self.log_test("Get Specific Account", False, "No account ID provided")
            return False, {}
        
        success, response = self.run_test("Get Specific Account", "GET", f"accounts/{account_id}", 200)
        
        if success:
            if response.get("id") == account_id:
                self.log_test("Account ID Match", True)
            else:
                self.log_test("Account ID Match", False, "Returned ID doesn't match requested ID")
        
        return success, response
    
    def test_update_account(self, account_id):
        """Test updating an account"""
        if not account_id:
            self.log_test("Update Account", False, "No account ID provided")
            return False, {}
        
        update_data = {
            "name": "Updated Test Account",
            "gold": 200000.75,
            "account_info": {
                "power": 2000000,
                "level": 90
            }
        }
        
        success, response = self.run_test("Update Account", "PUT", f"accounts/{account_id}", 200, update_data)
        
        if success:
            if response.get("name") == "Updated Test Account" and response.get("gold") == 200000.75:
                self.log_test("Account Update Verification", True)
            else:
                self.log_test("Account Update Verification", False, "Updated values not reflected")
        
        return success, response
    
    def test_delete_account(self, account_id):
        """Test deleting an account"""
        if not account_id:
            self.log_test("Delete Account", False, "No account ID provided")
            return False
        
        success, _ = self.run_test("Delete Account", "DELETE", f"accounts/{account_id}", 200)
        
        if success:
            # Verify account is actually deleted
            deleted_check, _ = self.run_test("Verify Account Deleted", "GET", f"accounts/{account_id}", 404)
            return deleted_check
        
        return success

def main():
    print("🚀 Starting MIR4 Account Manager Backend API Tests")
    print("=" * 60)
    
    tester = MIR4APITester()
    
    # Test basic connectivity
    print("\n📡 Testing API Connectivity...")
    success, _ = tester.test_root_endpoint()
    if not success:
        print("❌ Backend API is not accessible. Stopping tests.")
        return 1
    
    # Test boss prices endpoints
    print("\n💰 Testing Boss Prices...")
    tester.test_get_boss_prices()
    tester.test_update_boss_prices()
    
    # Test accounts endpoints
    print("\n👤 Testing Accounts...")
    tester.test_get_accounts_empty()
    
    # Test account CRUD operations
    print("\n🔄 Testing Account CRUD Operations...")
    success, account_id = tester.test_create_account()
    
    if account_id:
        tester.test_get_specific_account(account_id)
        tester.test_update_account(account_id)
        tester.test_delete_account(account_id)
    else:
        print("⚠️  Skipping remaining account tests due to failed account creation")
    
    # Final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {len(tester.failed_tests)}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for fail in tester.failed_tests:
            print(f"   - {fail['test']}: {fail['details']}")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())