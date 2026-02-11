"""
Multi-Tenant Architecture Backend Tests
Tests for: Signup, Signin, Data Isolation by BusinessId, Credit Phone Validation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pos-retail-app.preview.emergentagent.com').rstrip('/')

class TestAuthEndpoints:
    """Authentication endpoint tests - Signup and Signin"""
    
    def test_signup_creates_user_and_business(self):
        """Test that signup creates user and business records, returns message (not token)"""
        unique_suffix = uuid.uuid4().hex[:8]
        payload = {
            "username": f"TEST_signup_{unique_suffix}",
            "password": "testpassword123",
            "businessName": f"TEST_Business_{unique_suffix}"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Signup failed: {response.text}"
        
        # Data assertions - Signup returns message, userId, businessId (no token)
        data = response.json()
        assert "message" in data, "Signup should return a message"
        assert "userId" in data, "Signup should return userId"
        assert "businessId" in data, "Signup should return businessId"
        assert "access_token" not in data, "Signup should NOT return access_token"
        assert data["message"] == "Account created successfully. Please sign in."
        assert len(data["userId"]) > 0
        assert len(data["businessId"]) > 0
        
        print(f"✓ Signup created user {data['userId']} with business {data['businessId']}")
        
        # Store for cleanup
        return data
    
    def test_signup_duplicate_username_fails(self):
        """Test that duplicate username fails signup"""
        unique_suffix = uuid.uuid4().hex[:8]
        payload = {
            "username": f"TEST_dup_{unique_suffix}",
            "password": "testpassword123",
            "businessName": f"TEST_Business_{unique_suffix}"
        }
        
        # First signup
        response1 = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
        assert response1.status_code == 200
        
        # Second signup with same username should fail
        response2 = requests.post(f"{BASE_URL}/api/auth/signup", json=payload)
        assert response2.status_code == 400, "Duplicate username should return 400"
        assert "already exists" in response2.json().get("detail", "").lower()
        
        print("✓ Duplicate username correctly rejected")
    
    def test_signin_returns_complete_response(self):
        """Test that signin returns token, userId, businessId, username"""
        # Use pre-created test user
        payload = {
            "username": "testuser1",
            "password": "test123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/signin", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Signin failed: {response.text}"
        
        # Data assertions - Signin returns all required fields
        data = response.json()
        assert "access_token" in data, "Signin should return access_token"
        assert "token_type" in data, "Signin should return token_type"
        assert "userId" in data, "Signin should return userId"
        assert "businessId" in data, "Signin should return businessId"
        assert "username" in data, "Signin should return username"
        
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0
        assert len(data["userId"]) > 0
        assert len(data["businessId"]) > 0
        assert data["username"] == "testuser1"
        
        print(f"✓ Signin returned complete response for user {data['userId']}")
        
        return data
    
    def test_signin_invalid_credentials(self):
        """Test that invalid credentials fail signin"""
        payload = {
            "username": "nonexistent_user_xyz",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/signin", json=payload)
        assert response.status_code == 401
        
        print("✓ Invalid credentials correctly rejected")
    
    def test_signin_wrong_password(self):
        """Test that wrong password fails signin"""
        payload = {
            "username": "testuser1",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/signin", json=payload)
        assert response.status_code == 401
        
        print("✓ Wrong password correctly rejected")


class TestDataIsolation:
    """Test multi-tenant data isolation by businessId"""
    
    @pytest.fixture
    def user1_session(self):
        """Get authenticated session for testuser1"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "username": "testuser1",
            "password": "test123"
        })
        assert response.status_code == 200, f"User1 signin failed: {response.text}"
        data = response.json()
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {data['access_token']}",
            "Content-Type": "application/json"
        })
        session.user_data = data
        return session
    
    @pytest.fixture
    def user2_session(self):
        """Get authenticated session for testuser2"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "username": "testuser2",
            "password": "test123"
        })
        assert response.status_code == 200, f"User2 signin failed: {response.text}"
        data = response.json()
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {data['access_token']}",
            "Content-Type": "application/json"
        })
        session.user_data = data
        return session
    
    def test_products_filtered_by_business(self, user1_session, user2_session):
        """Test that products are filtered by businessId - users see only their products"""
        unique_suffix = uuid.uuid4().hex[:8]
        
        # User1 creates a product
        product1_payload = {
            "name": f"TEST_User1_Product_{unique_suffix}",
            "price": 100.0,
            "stock": 10,
            "category": "test"
        }
        create_resp = user1_session.post(f"{BASE_URL}/api/products", json=product1_payload)
        assert create_resp.status_code == 200, f"Create product failed: {create_resp.text}"
        product1 = create_resp.json()
        product1_id = product1["_id"]
        
        print(f"✓ User1 created product: {product1_id}")
        
        # User2 creates a product
        product2_payload = {
            "name": f"TEST_User2_Product_{unique_suffix}",
            "price": 200.0,
            "stock": 20,
            "category": "test"
        }
        create_resp2 = user2_session.post(f"{BASE_URL}/api/products", json=product2_payload)
        assert create_resp2.status_code == 200, f"Create product2 failed: {create_resp2.text}"
        product2 = create_resp2.json()
        product2_id = product2["_id"]
        
        print(f"✓ User2 created product: {product2_id}")
        
        # User1 gets products - should see ONLY their products
        user1_products = user1_session.get(f"{BASE_URL}/api/products").json()
        user1_product_ids = [p["_id"] for p in user1_products]
        
        assert product1_id in user1_product_ids, "User1 should see their own product"
        assert product2_id not in user1_product_ids, "User1 should NOT see User2's product"
        
        print(f"✓ User1 sees {len(user1_products)} products, including their own")
        
        # User2 gets products - should see ONLY their products
        user2_products = user2_session.get(f"{BASE_URL}/api/products").json()
        user2_product_ids = [p["_id"] for p in user2_products]
        
        assert product2_id in user2_product_ids, "User2 should see their own product"
        assert product1_id not in user2_product_ids, "User2 should NOT see User1's product"
        
        print(f"✓ User2 sees {len(user2_products)} products, including their own")
        
        # Cleanup - User1 deletes their product
        del_resp1 = user1_session.delete(f"{BASE_URL}/api/products/{product1_id}")
        assert del_resp1.status_code == 200, f"Delete product1 failed: {del_resp1.text}"
        
        # Cleanup - User2 deletes their product
        del_resp2 = user2_session.delete(f"{BASE_URL}/api/products/{product2_id}")
        assert del_resp2.status_code == 200, f"Delete product2 failed: {del_resp2.text}"
        
        print("✓ Products isolation test passed - users only see their own products")
    
    def test_user_cannot_access_other_users_product(self, user1_session, user2_session):
        """Test that a user cannot access another user's product by ID"""
        unique_suffix = uuid.uuid4().hex[:8]
        
        # User1 creates a product
        product_payload = {
            "name": f"TEST_Isolation_Product_{unique_suffix}",
            "price": 150.0,
            "stock": 5,
            "category": "test"
        }
        create_resp = user1_session.post(f"{BASE_URL}/api/products", json=product_payload)
        assert create_resp.status_code == 200
        product = create_resp.json()
        product_id = product["_id"]
        
        # User2 tries to get User1's product by ID - should fail (400 or 404)
        get_resp = user2_session.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_resp.status_code in [400, 404], f"User2 should NOT be able to access User1's product, got {get_resp.status_code}"
        
        print(f"✓ User2 cannot access User1's product by ID (status: {get_resp.status_code})")
        
        # User2 tries to update User1's product - should fail (400 or 404)
        update_resp = user2_session.put(f"{BASE_URL}/api/products/{product_id}", json={"name": "Hacked"})
        assert update_resp.status_code in [400, 404], f"User2 should NOT be able to update User1's product, got {update_resp.status_code}"
        
        print(f"✓ User2 cannot update User1's product (status: {update_resp.status_code})")
        
        # User2 tries to delete User1's product - should fail (400 or 404)
        delete_resp = user2_session.delete(f"{BASE_URL}/api/products/{product_id}")
        assert delete_resp.status_code in [400, 404], f"User2 should NOT be able to delete User1's product, got {delete_resp.status_code}"
        
        print("✓ User2 cannot delete User1's product")
        
        # Cleanup - User1 deletes their own product
        del_resp = user1_session.delete(f"{BASE_URL}/api/products/{product_id}")
        assert del_resp.status_code == 200
        
        print("✓ Product access isolation test passed")
    
    def test_settings_filtered_by_business(self, user1_session, user2_session):
        """Test that settings are filtered by businessId"""
        # User1 gets their settings
        settings1_resp = user1_session.get(f"{BASE_URL}/api/settings")
        assert settings1_resp.status_code == 200, f"Get settings1 failed: {settings1_resp.text}"
        settings1 = settings1_resp.json()
        
        # User2 gets their settings
        settings2_resp = user2_session.get(f"{BASE_URL}/api/settings")
        assert settings2_resp.status_code == 200, f"Get settings2 failed: {settings2_resp.text}"
        settings2 = settings2_resp.json()
        
        # Each user should see their own businessId in settings
        user1_business = user1_session.user_data["businessId"]
        user2_business = user2_session.user_data["businessId"]
        
        assert settings1.get("businessId") == user1_business, "User1 settings should have User1's businessId"
        assert settings2.get("businessId") == user2_business, "User2 settings should have User2's businessId"
        
        print(f"✓ User1 settings businessId: {settings1.get('businessId')}")
        print(f"✓ User2 settings businessId: {settings2.get('businessId')}")
        print("✓ Settings isolation test passed")


class TestCreditSalesValidation:
    """Test credit sales phone number validation"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "username": "testuser1",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {data['access_token']}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_credit_sale_requires_phone_number(self, auth_session):
        """Test that credit payment requires customer phone number"""
        # First create a product to sell
        unique_suffix = uuid.uuid4().hex[:8]
        product_payload = {
            "name": f"TEST_CreditSale_Product_{unique_suffix}",
            "price": 100.0,
            "stock": 10,
            "category": "test"
        }
        create_resp = auth_session.post(f"{BASE_URL}/api/products", json=product_payload)
        assert create_resp.status_code == 200
        product = create_resp.json()
        product_id = product["_id"]
        
        # Try to create credit sale WITHOUT phone number - should fail
        sale_payload = {
            "items": [{
                "productId": product_id,
                "productName": product["name"],
                "quantity": 1,
                "price": 100.0,
                "image": ""
            }],
            "total": 100.0,
            "paymentMethod": "credit"
            # Missing customerPhone
        }
        
        sale_resp = auth_session.post(f"{BASE_URL}/api/sales", json=sale_payload)
        assert sale_resp.status_code == 400, f"Credit sale without phone should fail: {sale_resp.text}"
        assert "phone" in sale_resp.json().get("detail", "").lower(), "Error should mention phone"
        
        print("✓ Credit sale without phone correctly rejected")
        
        # Try with empty phone number - should also fail
        sale_payload["customerPhone"] = ""
        sale_resp2 = auth_session.post(f"{BASE_URL}/api/sales", json=sale_payload)
        assert sale_resp2.status_code == 400, "Credit sale with empty phone should fail"
        
        print("✓ Credit sale with empty phone correctly rejected")
        
        # Try with whitespace phone number - should also fail
        sale_payload["customerPhone"] = "   "
        sale_resp3 = auth_session.post(f"{BASE_URL}/api/sales", json=sale_payload)
        assert sale_resp3.status_code == 400, "Credit sale with whitespace phone should fail"
        
        print("✓ Credit sale with whitespace phone correctly rejected")
        
        # Now try with valid phone number - should succeed
        sale_payload["customerPhone"] = "9876543210"
        sale_resp4 = auth_session.post(f"{BASE_URL}/api/sales", json=sale_payload)
        assert sale_resp4.status_code == 200, f"Credit sale with valid phone should succeed: {sale_resp4.text}"
        sale = sale_resp4.json()
        assert sale["customerPhone"] == "9876543210"
        
        print("✓ Credit sale with valid phone succeeded")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/products/{product_id}")
        
        print("✓ Credit phone validation test passed")
    
    def test_cash_sale_does_not_require_phone(self, auth_session):
        """Test that cash payment does NOT require phone number"""
        unique_suffix = uuid.uuid4().hex[:8]
        product_payload = {
            "name": f"TEST_CashSale_Product_{unique_suffix}",
            "price": 50.0,
            "stock": 5,
            "category": "test"
        }
        create_resp = auth_session.post(f"{BASE_URL}/api/products", json=product_payload)
        assert create_resp.status_code == 200
        product = create_resp.json()
        product_id = product["_id"]
        
        # Create cash sale without phone - should succeed
        sale_payload = {
            "items": [{
                "productId": product_id,
                "productName": product["name"],
                "quantity": 1,
                "price": 50.0,
                "image": ""
            }],
            "total": 50.0,
            "paymentMethod": "cash"
            # No customerPhone
        }
        
        sale_resp = auth_session.post(f"{BASE_URL}/api/sales", json=sale_payload)
        assert sale_resp.status_code == 200, f"Cash sale without phone should succeed: {sale_resp.text}"
        
        print("✓ Cash sale without phone succeeded")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/products/{product_id}")
        
        print("✓ Cash sale test passed")


class TestSalesDataIsolation:
    """Test sales data isolation by businessId"""
    
    @pytest.fixture
    def user1_session(self):
        """Get authenticated session for testuser1"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "username": "testuser1",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {data['access_token']}",
            "Content-Type": "application/json"
        })
        session.user_data = data
        return session
    
    @pytest.fixture
    def user2_session(self):
        """Get authenticated session for testuser2"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "username": "testuser2",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {data['access_token']}",
            "Content-Type": "application/json"
        })
        session.user_data = data
        return session
    
    def test_sales_filtered_by_business(self, user1_session, user2_session):
        """Test that sales are filtered by businessId"""
        unique_suffix = uuid.uuid4().hex[:8]
        
        # User1 creates a product and makes a sale
        product_payload = {
            "name": f"TEST_SaleIsolation_Product_{unique_suffix}",
            "price": 75.0,
            "stock": 20,
            "category": "test"
        }
        create_resp = user1_session.post(f"{BASE_URL}/api/products", json=product_payload)
        assert create_resp.status_code == 200
        product = create_resp.json()
        product_id = product["_id"]
        
        # User1 creates a sale
        sale_payload = {
            "items": [{
                "productId": product_id,
                "productName": product["name"],
                "quantity": 2,
                "price": 75.0,
                "image": ""
            }],
            "total": 150.0,
            "paymentMethod": "cash"
        }
        sale_resp = user1_session.post(f"{BASE_URL}/api/sales", json=sale_payload)
        assert sale_resp.status_code == 200
        sale = sale_resp.json()
        sale_id = sale["_id"]
        
        print(f"✓ User1 created sale: {sale_id}")
        
        # User1 should see their sale in today's sales
        user1_sales = user1_session.get(f"{BASE_URL}/api/sales/today").json()
        user1_sale_ids = [s["_id"] for s in user1_sales]
        assert sale_id in user1_sale_ids, "User1 should see their own sale"
        
        print(f"✓ User1 sees {len(user1_sales)} sales today")
        
        # User2 should NOT see User1's sale
        user2_sales = user2_session.get(f"{BASE_URL}/api/sales/today").json()
        user2_sale_ids = [s["_id"] for s in user2_sales]
        assert sale_id not in user2_sale_ids, "User2 should NOT see User1's sale"
        
        print(f"✓ User2 sees {len(user2_sales)} sales today (correctly excludes User1's sale)")
        
        # User2 tries to get User1's sale by ID - should fail (400 or 404)
        get_resp = user2_session.get(f"{BASE_URL}/api/sales/{sale_id}")
        assert get_resp.status_code in [400, 404], f"User2 should NOT access User1's sale by ID, got {get_resp.status_code}"
        
        print("✓ User2 cannot access User1's sale by ID")
        
        # Cleanup
        user1_session.delete(f"{BASE_URL}/api/products/{product_id}")
        
        print("✓ Sales isolation test passed")


class TestEndpointsRequireAuth:
    """Test that protected endpoints require authentication"""
    
    def test_products_require_auth(self):
        """Test that products endpoints require authentication"""
        # GET products
        resp = requests.get(f"{BASE_URL}/api/products")
        assert resp.status_code == 403 or resp.status_code == 401, "Products GET should require auth"
        
        # POST products
        resp = requests.post(f"{BASE_URL}/api/products", json={"name": "test", "price": 10, "stock": 1})
        assert resp.status_code == 403 or resp.status_code == 401, "Products POST should require auth"
        
        print("✓ Products endpoints require authentication")
    
    def test_sales_require_auth(self):
        """Test that sales endpoints require authentication"""
        # GET sales
        resp = requests.get(f"{BASE_URL}/api/sales")
        assert resp.status_code == 403 or resp.status_code == 401, "Sales GET should require auth"
        
        # GET today's sales
        resp = requests.get(f"{BASE_URL}/api/sales/today")
        assert resp.status_code == 403 or resp.status_code == 401, "Sales today should require auth"
        
        print("✓ Sales endpoints require authentication")
    
    def test_settings_require_auth(self):
        """Test that settings endpoints require authentication"""
        # GET settings
        resp = requests.get(f"{BASE_URL}/api/settings")
        assert resp.status_code == 403 or resp.status_code == 401, "Settings GET should require auth"
        
        print("✓ Settings endpoints require authentication")


class TestForgotPassword:
    """Test forgot password endpoint"""
    
    def test_forgot_password_endpoint(self):
        """Test forgot password returns success message"""
        payload = {"username": "testuser1"}
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "sent" in data["message"].lower() or "request" in data["message"].lower()
        
        print("✓ Forgot password endpoint works")
    
    def test_forgot_password_nonexistent_user(self):
        """Test forgot password for nonexistent user still returns success (security)"""
        payload = {"username": "nonexistent_user_xyz123"}
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json=payload)
        
        # Should still return 200 (don't reveal if user exists)
        assert response.status_code == 200
        
        print("✓ Forgot password doesn't reveal user existence")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
