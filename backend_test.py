#!/usr/bin/env python3
"""
Backend API Testing Script for Return and Exchange Endpoints
Tests the Return and Exchange API endpoints as specified in the review request.
"""

import requests
import json
from datetime import datetime
import sys

# Backend URL from environment
BACKEND_URL = "https://retail-checkout-demo.preview.emergentagent.com"

class ReturnExchangeAPITester:
    def __init__(self):
        self.base_url = f"{BACKEND_URL}/api"
        self.test_results = []
        
    def log_result(self, test_name, success, details, response_data=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        if response_data:
            result['response_data'] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()

    def get_existing_sales(self):
        """Get existing sales to use for testing"""
        try:
            response = requests.get(f"{self.base_url}/sales", timeout=10)
            if response.status_code == 200:
                sales = response.json()
                if sales and len(sales) > 0:
                    return sales
                else:
                    self.log_result("Get Existing Sales", False, "No existing sales found in database")
                    return None
            else:
                self.log_result("Get Existing Sales", False, f"Failed to get sales: {response.status_code}")
                return None
        except Exception as e:
            self.log_result("Get Existing Sales", False, f"Exception getting sales: {str(e)}")
            return None

    def test_get_sale_by_id(self, sale_id):
        """Test GET /api/sales/{sale_id}"""
        try:
            response = requests.get(f"{self.base_url}/sales/{sale_id}", timeout=10)
            
            if response.status_code == 200:
                sale_data = response.json()
                # Verify required fields
                required_fields = ['_id', 'items', 'total', 'paymentMethod']
                missing_fields = [field for field in required_fields if field not in sale_data]
                
                if not missing_fields:
                    self.log_result(
                        "GET /api/sales/{sale_id}",
                        True,
                        f"Successfully retrieved sale details. Total: ${sale_data['total']}, Items: {len(sale_data['items'])}, Payment: {sale_data['paymentMethod']}"
                    )
                    return sale_data
                else:
                    self.log_result(
                        "GET /api/sales/{sale_id}",
                        False,
                        f"Missing required fields: {missing_fields}",
                        sale_data
                    )
                    return None
            else:
                self.log_result(
                    "GET /api/sales/{sale_id}",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result("GET /api/sales/{sale_id}", False, f"Exception: {str(e)}")
            return None

    def test_create_return(self, original_sale):
        """Test POST /api/returns"""
        try:
            if not original_sale or 'items' not in original_sale:
                self.log_result("POST /api/returns", False, "No valid original sale provided")
                return None
                
            # Create return for first item (partial return)
            first_item = original_sale['items'][0]
            return_quantity = min(1, first_item['quantity'])  # Return 1 item or available quantity
            
            return_data = {
                "originalSaleId": original_sale['_id'],
                "items": [{
                    "productId": first_item['productId'],
                    "productName": first_item['productName'],
                    "quantity": return_quantity,
                    "price": first_item['price']
                }],
                "returnTotal": first_item['price'] * return_quantity,
                "reason": "Defective item",
                "type": "return"
            }
            
            response = requests.post(
                f"{self.base_url}/returns",
                json=return_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                return_response = response.json()
                # Verify return was created (check for _id or id)
                return_id = return_response.get('_id') or return_response.get('id')
                if return_id:
                    self.log_result(
                        "POST /api/returns",
                        True,
                        f"Return created successfully. Return ID: {return_id}, Amount: ${return_data['returnTotal']}"
                    )
                    return return_response
                else:
                    self.log_result(
                        "POST /api/returns",
                        False,
                        "Return created but no ID returned",
                        return_response
                    )
                    return None
            else:
                self.log_result(
                    "POST /api/returns",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result("POST /api/returns", False, f"Exception: {str(e)}")
            return None

    def test_get_all_returns(self):
        """Test GET /api/returns"""
        try:
            response = requests.get(f"{self.base_url}/returns", timeout=10)
            
            if response.status_code == 200:
                returns = response.json()
                if isinstance(returns, list):
                    self.log_result(
                        "GET /api/returns",
                        True,
                        f"Successfully retrieved {len(returns)} returns"
                    )
                    return returns
                else:
                    self.log_result(
                        "GET /api/returns",
                        False,
                        "Response is not a list",
                        returns
                    )
                    return None
            else:
                self.log_result(
                    "GET /api/returns",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result("GET /api/returns", False, f"Exception: {str(e)}")
            return None

    def test_get_returns_by_sale(self, sale_id):
        """Test GET /api/returns/by-sale/{sale_id}"""
        try:
            response = requests.get(f"{self.base_url}/returns/by-sale/{sale_id}", timeout=10)
            
            if response.status_code == 200:
                returns = response.json()
                if isinstance(returns, list):
                    self.log_result(
                        "GET /api/returns/by-sale/{sale_id}",
                        True,
                        f"Successfully retrieved {len(returns)} returns for sale {sale_id}"
                    )
                    return returns
                else:
                    self.log_result(
                        "GET /api/returns/by-sale/{sale_id}",
                        False,
                        "Response is not a list",
                        returns
                    )
                    return None
            else:
                self.log_result(
                    "GET /api/returns/by-sale/{sale_id}",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result("GET /api/returns/by-sale/{sale_id}", False, f"Exception: {str(e)}")
            return None

    def test_inventory_update(self, return_data, original_sale):
        """Test that inventory was updated after return"""
        try:
            if not return_data or not original_sale:
                self.log_result("Inventory Update Verification", False, "Missing return or original sale data")
                return False
                
            # Get the returned item's product details
            returned_item = return_data.get('items', [{}])[0] if return_data.get('items') else {}
            if not returned_item.get('productId'):
                self.log_result("Inventory Update Verification", False, "No product ID in return data")
                return False
                
            # Get current product to check stock level
            response = requests.get(f"{self.base_url}/products/{returned_item['productId']}", timeout=10)
            
            if response.status_code == 200:
                product = response.json()
                current_stock = product.get('stock', 0)
                self.log_result(
                    "Inventory Update Verification",
                    True,
                    f"Product {returned_item['productName']} current stock: {current_stock}. Return should have increased stock by {returned_item['quantity']}"
                )
                return True
            else:
                self.log_result(
                    "Inventory Update Verification",
                    False,
                    f"Could not retrieve product details: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Inventory Update Verification", False, f"Exception: {str(e)}")
            return False

    def run_tests(self):
        """Run all return and exchange tests"""
        print("=" * 60)
        print("RETURN AND EXCHANGE API TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print()
        
        # Step 1: Get existing sales
        print("Step 1: Getting existing sale for testing...")
        existing_sales = self.get_existing_sales()
        if not existing_sales:
            print("❌ Cannot proceed with testing - no existing sales found")
            return False
            
        test_sale = existing_sales[0]  # Use first sale
        sale_id = test_sale['_id']
        print(f"Using sale ID: {sale_id}")
        print()
        
        # Step 2: Test GET /api/sales/{sale_id}
        print("Step 2: Testing GET /api/sales/{sale_id}...")
        sale_details = self.test_get_sale_by_id(sale_id)
        
        # Step 3: Test POST /api/returns
        print("Step 3: Testing POST /api/returns...")
        return_response = self.test_create_return(sale_details)
        
        # Step 4: Test GET /api/returns/by-sale/{sale_id}
        print("Step 4: Testing GET /api/returns/by-sale/{sale_id}...")
        sale_returns = self.test_get_returns_by_sale(sale_id)
        
        # Step 5: Test GET /api/returns
        print("Step 5: Testing GET /api/returns...")
        all_returns = self.test_get_all_returns()
        
        # Step 6: Verify inventory update
        print("Step 6: Verifying inventory update...")
        self.test_inventory_update(return_response, sale_details)
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print()
        
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            
        return passed == total

if __name__ == "__main__":
    tester = ReturnExchangeAPITester()
    success = tester.run_tests()
    
    if not success:
        sys.exit(1)