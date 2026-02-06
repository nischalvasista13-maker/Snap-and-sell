#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Camera-first POS App
Tests all Settings, Products, and Sales API endpoints
"""

import requests
import json
from datetime import datetime
import base64
import sys

# Backend URL configuration
BACKEND_URL = "https://retail-checkout-demo.preview.emergentagent.com/api"

# Test data - Using realistic fashion retail data
SHOP_SETUP = {
    "shopName": "Fashion Forward Boutique",
    "ownerName": "Sarah Johnson"
}

# Base64 test image (small 1x1 pixel PNG)
TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

TEST_PRODUCTS = [
    {
        "name": "Summer Floral Dress",
        "price": 89.99,
        "stock": 15,
        "category": "Dresses",
        "size": "M",
        "color": "Blue Floral",
        "images": [TEST_IMAGE_BASE64]
    },
    {
        "name": "Leather Handbag",
        "price": 129.50,
        "stock": 8,
        "category": "Accessories",
        "size": "Medium",
        "color": "Black",
        "images": [TEST_IMAGE_BASE64]
    },
    {
        "name": "Designer Jeans",
        "price": 79.00,
        "stock": 12,
        "category": "Bottoms",
        "size": "32",
        "color": "Dark Blue",
        "images": [TEST_IMAGE_BASE64]
    }
]

class POSBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.created_products = []
        self.created_sales = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} | {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success:
            self.test_failures.append(f"{test_name}: {details}")
    
    def run_all_tests(self):
        """Execute all backend API tests following the specified flow"""
        self.test_failures = []
        
        print("=" * 80)
        print("🧪 STARTING BACKEND API TESTING FOR CAMERA-FIRST POS APP")
        print("=" * 80)
        
        try:
            # 1. Test Settings API
            print("\n📋 TESTING SETTINGS API")
            self.test_settings_api()
            
            # 2. Test Products API - Full CRUD
            print("\n🛍️ TESTING PRODUCTS API")
            self.test_products_crud()
            
            # 3. Test Sales API with Stock Updates
            print("\n💰 TESTING SALES API")
            self.test_sales_api()
            
            # 4. Test Integration Flow
            print("\n🔄 TESTING INTEGRATION FLOW")
            self.test_integration_flow()
            
            # Summary
            self.print_summary()
            
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR: {str(e)}")
            self.test_failures.append(f"Critical testing error: {str(e)}")
            
    def test_settings_api(self):
        """Test settings endpoints"""
        
        # Test GET settings before setup
        try:
            response = self.session.get(f"{BACKEND_URL}/settings")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /settings (before setup)", True, f"Response: {data}")
            else:
                self.log_test("GET /settings (before setup)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /settings (before setup)", False, f"Error: {str(e)}")
        
        # Test POST settings/setup
        try:
            response = self.session.post(f"{BACKEND_URL}/settings/setup", 
                                       json=SHOP_SETUP)
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['shopName', 'ownerName', 'setupCompleted']
                has_all_fields = all(field in data for field in expected_fields)
                self.log_test("POST /settings/setup", has_all_fields, 
                            f"Shop: {data.get('shopName')}, Owner: {data.get('ownerName')}")
            else:
                self.log_test("POST /settings/setup", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /settings/setup", False, f"Error: {str(e)}")
            
        # Test GET settings after setup
        try:
            response = self.session.get(f"{BACKEND_URL}/settings")
            if response.status_code == 200:
                data = response.json()
                is_setup_complete = data.get('setupCompleted') == True
                self.log_test("GET /settings (after setup)", is_setup_complete, 
                            f"Setup completed: {data.get('setupCompleted')}")
            else:
                self.log_test("GET /settings (after setup)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /settings (after setup)", False, f"Error: {str(e)}")
            
        # Test duplicate setup (should fail)
        try:
            response = self.session.post(f"{BACKEND_URL}/settings/setup", 
                                       json=SHOP_SETUP)
            should_fail = response.status_code == 400
            self.log_test("POST /settings/setup (duplicate)", should_fail, 
                        f"Correctly prevents duplicate setup")
        except Exception as e:
            self.log_test("POST /settings/setup (duplicate)", False, f"Error: {str(e)}")
    
    def test_products_crud(self):
        """Test all product CRUD operations"""
        
        # Test POST products (Create)
        for i, product_data in enumerate(TEST_PRODUCTS):
            try:
                response = self.session.post(f"{BACKEND_URL}/products", 
                                           json=product_data)
                if response.status_code == 200:
                    data = response.json()
                    if '_id' in data and data.get('name') == product_data['name']:
                        self.created_products.append(data)
                        self.log_test(f"POST /products ({product_data['name']})", True, 
                                    f"ID: {data['_id'][:8]}..., Stock: {data['stock']}")
                    else:
                        self.log_test(f"POST /products ({product_data['name']})", False, 
                                    "Missing required fields in response")
                else:
                    self.log_test(f"POST /products ({product_data['name']})", False, 
                                f"Status: {response.status_code}")
            except Exception as e:
                self.log_test(f"POST /products ({product_data['name']})", False, f"Error: {str(e)}")
        
        if not self.created_products:
            print("⚠️  No products created, skipping remaining product tests")
            return
            
        # Test GET products (Read all)
        try:
            response = self.session.get(f"{BACKEND_URL}/products")
            if response.status_code == 200:
                products = response.json()
                found_count = len([p for p in products if any(cp['_id'] == p['_id'] for cp in self.created_products)])
                self.log_test("GET /products", found_count >= len(self.created_products), 
                            f"Found {len(products)} products, {found_count} created by test")
            else:
                self.log_test("GET /products", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /products", False, f"Error: {str(e)}")
        
        # Test GET single product
        if self.created_products:
            test_product = self.created_products[0]
            try:
                response = self.session.get(f"{BACKEND_URL}/products/{test_product['_id']}")
                if response.status_code == 200:
                    data = response.json()
                    name_matches = data.get('name') == test_product['name']
                    self.log_test("GET /products/{id}", name_matches, 
                                f"Product: {data.get('name')}")
                else:
                    self.log_test("GET /products/{id}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("GET /products/{id}", False, f"Error: {str(e)}")
        
        # Test PUT product (Update)
        if self.created_products:
            test_product = self.created_products[0]
            update_data = {
                "price": 99.99,
                "stock": 20,
                "color": "Updated Blue"
            }
            try:
                response = self.session.put(f"{BACKEND_URL}/products/{test_product['_id']}", 
                                          json=update_data)
                if response.status_code == 200:
                    data = response.json()
                    price_updated = data.get('price') == 99.99
                    stock_updated = data.get('stock') == 20
                    self.log_test("PUT /products/{id}", price_updated and stock_updated, 
                                f"Price: ${data.get('price')}, Stock: {data.get('stock')}")
                    # Update local copy for later tests
                    self.created_products[0].update(data)
                else:
                    self.log_test("PUT /products/{id}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("PUT /products/{id}", False, f"Error: {str(e)}")
        
        # Test DELETE product (will test with last product to preserve others for sales test)
        if len(self.created_products) > 1:
            delete_product = self.created_products[-1]
            try:
                response = self.session.delete(f"{BACKEND_URL}/products/{delete_product['_id']}")
                if response.status_code == 200:
                    data = response.json()
                    success = "deleted successfully" in data.get('message', '')
                    self.log_test("DELETE /products/{id}", success, 
                                f"Message: {data.get('message')}")
                    if success:
                        self.created_products.remove(delete_product)
                else:
                    self.log_test("DELETE /products/{id}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("DELETE /products/{id}", False, f"Error: {str(e)}")
    
    def test_sales_api(self):
        """Test sales API and stock updates"""
        
        if len(self.created_products) < 2:
            print("⚠️  Need at least 2 products for sales test, skipping")
            return
        
        # Create a sale with multiple items
        sale_items = []
        total = 0
        
        for i, product in enumerate(self.created_products[:2]):  # Use first 2 products
            quantity = 2 if i == 0 else 1  # Different quantities
            item_total = product['price'] * quantity
            total += item_total
            
            sale_items.append({
                "productId": product['_id'],
                "productName": product['name'],
                "quantity": quantity,
                "price": product['price'],
                "image": product['images'][0] if product['images'] else ""
            })
        
        sale_data = {
            "items": sale_items,
            "total": total,
            "paymentMethod": "Cash"
        }
        
        # Store original stock levels for verification
        original_stocks = {item['productId']: self.get_product_stock(item['productId']) 
                          for item in sale_items}
        
        # Test POST sales
        try:
            response = self.session.post(f"{BACKEND_URL}/sales", json=sale_data)
            if response.status_code == 200:
                data = response.json()
                has_required = all(field in data for field in ['_id', 'items', 'total', 'timestamp'])
                self.log_test("POST /sales", has_required, 
                            f"Sale ID: {data.get('_id', '')[:8]}..., Total: ${data.get('total')}")
                if has_required:
                    self.created_sales.append(data)
            else:
                self.log_test("POST /sales", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /sales", False, f"Error: {str(e)}")
        
        # Verify stock updates
        for item in sale_items:
            original_stock = original_stocks.get(item['productId'])
            if original_stock is not None:
                new_stock = self.get_product_stock(item['productId'])
                if new_stock is not None:
                    expected_stock = original_stock - item['quantity']
                    stock_correct = new_stock == expected_stock
                    self.log_test(f"Stock update for {item['productName']}", stock_correct,
                                f"Original: {original_stock}, Expected: {expected_stock}, Actual: {new_stock}")
        
        # Test GET sales/today
        try:
            response = self.session.get(f"{BACKEND_URL}/sales/today")
            if response.status_code == 200:
                sales = response.json()
                found_today = any(sale.get('_id') == self.created_sales[0].get('_id') 
                                for sale in sales if self.created_sales)
                self.log_test("GET /sales/today", found_today, 
                            f"Found {len(sales)} today's sales")
            else:
                self.log_test("GET /sales/today", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /sales/today", False, f"Error: {str(e)}")
            
        # Test GET all sales
        try:
            response = self.session.get(f"{BACKEND_URL}/sales")
            if response.status_code == 200:
                sales = response.json()
                found_all = any(sale.get('_id') == self.created_sales[0].get('_id') 
                              for sale in sales if self.created_sales)
                self.log_test("GET /sales", found_all, 
                            f"Found {len(sales)} total sales")
            else:
                self.log_test("GET /sales", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /sales", False, f"Error: {str(e)}")
    
    def test_integration_flow(self):
        """Test the complete integration flow as specified"""
        
        print("  Testing complete workflow...")
        
        # Verify we can retrieve settings
        settings_ok = False
        try:
            response = self.session.get(f"{BACKEND_URL}/settings")
            settings_ok = response.status_code == 200 and response.json().get('setupCompleted')
        except:
            pass
        
        # Verify we have products
        products_ok = len(self.created_products) >= 2
        
        # Verify we have sales
        sales_ok = len(self.created_sales) >= 1
        
        # Overall flow test
        overall_success = settings_ok and products_ok and sales_ok
        self.log_test("Complete POS workflow", overall_success, 
                    f"Settings: {settings_ok}, Products: {products_ok}, Sales: {sales_ok}")
    
    def get_product_stock(self, product_id):
        """Helper to get current stock level of a product"""
        try:
            response = self.session.get(f"{BACKEND_URL}/products/{product_id}")
            if response.status_code == 200:
                return response.json().get('stock')
        except:
            pass
        return None
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        if not self.test_failures:
            print("🎉 ALL TESTS PASSED! Backend APIs are working correctly.")
            print("\n✅ Confirmed working features:")
            print("   • Settings API (setup and retrieval)")
            print("   • Products API (full CRUD operations)")
            print("   • Sales API (creation and retrieval)")  
            print("   • Stock management (automatic updates)")
            print("   • Complete POS workflow integration")
        else:
            print(f"❌ {len(self.test_failures)} TESTS FAILED:")
            for i, failure in enumerate(self.test_failures, 1):
                print(f"   {i}. {failure}")
                
        print(f"\n📈 Statistics:")
        print(f"   • Products created: {len(self.created_products)}")
        print(f"   • Sales transactions: {len(self.created_sales)}")
        print(f"   • Backend URL: {BACKEND_URL}")

def main():
    """Main test execution"""
    tester = POSBackendTester()
    tester.run_all_tests()
    return len(tester.test_failures) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)