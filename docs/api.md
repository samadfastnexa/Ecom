# API Documentation

## Authentication Endpoints

Base URL: `http://<your-ip>:8002/api/auth/`

### 1. Register User
- **URL**: `/register/`
- **Method**: `POST`
- **Description**: Creates a new user account.
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```
- **Validation**:
  - Email must be unique.
  - Password must be at least 8 chars, contain uppercase, lowercase, number, and special char.
- **Response (201 Created)**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```

### 2. Login (Get Token)
- **URL**: `/login/`
- **Method**: `POST`
- **Description**: Authenticates user and returns JWT tokens.
- **Request Body**:
  ```json
  {
    "username": "johndoe",  // Or email if configured, currently defaults to username
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

### 3. Refresh Token
- **URL**: `/token/refresh/`
- **Method**: `POST`
- **Description**: Refreshes the access token using a refresh token.
- **Request Body**:
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

### 4. User Profile
- **URL**: `/profile/`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Retrieves current user's profile information.
- **Response (200 OK)**: the serializer returns the full profile (~24 fields). Beyond the
  core identity fields it also includes `user_type`, `phone_number`, `address`,
  `is_available`, `account_balance`, `is_staff`, `can_manage_plant`, and staff/HR fields.
  See `UserSerializer` in `backend/accounts/serializers.py` for the authoritative list.
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "customer"
  }
  ```

## Security & Rate Limiting
- **Throttling**:
  - Anonymous users: 10 requests/minute
  - Authenticated users: 100 requests/minute
- **Password Policy**: Enforced strong passwords via custom validation.
