"""
Tests for app/crud/user.py

This module tests:
- User creation (CREATE)
- User retrieval by email (READ)
- User retrieval by ID (READ)
- User authentication
- Error handling in CRUD operations
"""

import pytest
from sqlalchemy.orm import Session

from app.crud.user import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    authenticate_user,
)
from app.core.security import verify_password, get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate


class TestCreateUser:
    """Test user creation functionality."""

    def test_create_user_success(self, test_db: Session, sample_user_data: dict):
        """Test successful user creation."""
        user_in = UserCreate(**sample_user_data)
        
        user = create_user(test_db, user_in)
        
        assert user.user_id is not None
        assert user.email == sample_user_data["email"].lower()
        assert user.is_active is True
        assert user.password_hash != sample_user_data["password"]  # Should be hashed
        assert verify_password(sample_user_data["password"], user.password_hash)

    def test_create_user_email_lowercase(self, test_db: Session):
        """Test that email is stored in lowercase."""
        user_in = UserCreate(
            email="TestUser@EXAMPLE.COM",
            password="TestPassword123!",
        )
        
        user = create_user(test_db, user_in)
        
        assert user.email == "testuser@example.com"

    def test_create_user_password_is_hashed(self, test_db: Session, sample_user_data: dict):
        """Test that password is hashed and not stored in plain text."""
        plain_password = sample_user_data["password"]
        user_in = UserCreate(**sample_user_data)
        
        user = create_user(test_db, user_in)
        
        assert user.password_hash != plain_password
        assert len(user.password_hash) == 60  # Bcrypt hash length
        assert user.password_hash.startswith("$2b$") or user.password_hash.startswith("$2a$")

    def test_create_user_has_timestamps(self, test_db: Session, sample_user_data: dict):
        """Test that created user has timestamp fields."""
        user_in = UserCreate(**sample_user_data)
        
        user = create_user(test_db, user_in)
        
        assert user.created_at is not None

    def test_create_user_different_passwords_different_hashes(self, test_db: Session):
        """Test that different passwords produce different hashes."""
        user1_data = UserCreate(email="user1@example.com", password="Password123!")
        user2_data = UserCreate(email="user2@example.com", password="DifferentPass456@")
        
        user1 = create_user(test_db, user1_data)
        user2 = create_user(test_db, user2_data)
        
        assert user1.password_hash != user2.password_hash

    def test_create_multiple_users(self, test_db: Session):
        """Test creating multiple users."""
        users_data = [
            UserCreate(email="user1@example.com", password="Password123!"),
            UserCreate(email="user2@example.com", password="Password456@"),
            UserCreate(email="user3@example.com", password="Password789#"),
        ]
        
        created_users = []
        for user_data in users_data:
            user = create_user(test_db, user_data)
            created_users.append(user)
        
        assert len(created_users) == 3
        assert all(user.user_id is not None for user in created_users)
        assert all(user.is_active for user in created_users)


class TestGetUserByEmail:
    """Test retrieving users by email."""

    def test_get_user_by_email_existing_user(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test retrieving an existing user by email."""
        user = get_user_by_email(test_db, sample_user_data["email"])
        
        assert user is not None
        assert user.email == sample_user_data["email"].lower()
        assert user.user_id == db_user.user_id

    def test_get_user_by_email_case_insensitive(self, test_db: Session, db_user: User):
        """Test that email lookup is case-insensitive."""
        # Try different case variations
        user_lower = get_user_by_email(test_db, db_user.email.lower())
        user_upper = get_user_by_email(test_db, db_user.email.upper())
        user_mixed = get_user_by_email(test_db, db_user.email.capitalize())
        
        assert user_lower is not None
        assert user_upper is not None
        assert user_mixed is not None
        assert user_lower.user_id == user_upper.user_id == user_mixed.user_id

    def test_get_user_by_email_nonexistent_user(self, test_db: Session):
        """Test retrieving a non-existent user returns None."""
        user = get_user_by_email(test_db, "nonexistent@example.com")
        
        assert user is None

    def test_get_user_by_email_empty_string(self, test_db: Session):
        """Test retrieving user with empty email string."""
        user = get_user_by_email(test_db, "")
        
        assert user is None

    def test_get_user_by_email_whitespace(self, test_db: Session):
        """Test retrieving user with whitespace in email."""
        user = get_user_by_email(test_db, "   ")
        
        assert user is None

    def test_get_user_by_email_returns_correct_user(self, test_db: Session):
        """Test that correct user is returned when multiple users exist."""
        # Create multiple users
        user1 = create_user(test_db, UserCreate(email="user1@example.com", password="Password123!"))
        user2 = create_user(test_db, UserCreate(email="user2@example.com", password="Password456@"))
        
        # Retrieve each user
        retrieved_user1 = get_user_by_email(test_db, "user1@example.com")
        retrieved_user2 = get_user_by_email(test_db, "user2@example.com")
        
        assert retrieved_user1.user_id == user1.user_id
        assert retrieved_user2.user_id == user2.user_id
        assert retrieved_user1.email != retrieved_user2.email


class TestGetUserById:
    """Test retrieving users by ID."""

    def test_get_user_by_id_existing_user(self, test_db: Session, db_user: User):
        """Test retrieving an existing user by ID."""
        user = get_user_by_id(test_db, db_user.user_id)
        
        assert user is not None
        assert user.user_id == db_user.user_id
        assert user.email == db_user.email

    def test_get_user_by_id_nonexistent_user(self, test_db: Session):
        """Test retrieving a non-existent user by ID returns None."""
        user = get_user_by_id(test_db, 999999)
        
        assert user is None

    def test_get_user_by_id_zero(self, test_db: Session):
        """Test retrieving user with ID 0."""
        user = get_user_by_id(test_db, 0)
        
        assert user is None

    def test_get_user_by_id_negative(self, test_db: Session):
        """Test retrieving user with negative ID."""
        user = get_user_by_id(test_db, -1)
        
        assert user is None

    def test_get_user_by_id_returns_correct_user(self, test_db: Session):
        """Test that correct user is returned when multiple users exist."""
        # Create multiple users
        user1 = create_user(test_db, UserCreate(email="user1@example.com", password="Password123!"))
        user2 = create_user(test_db, UserCreate(email="user2@example.com", password="Password456@"))
        
        # Retrieve each user by ID
        retrieved_user1 = get_user_by_id(test_db, user1.user_id)
        retrieved_user2 = get_user_by_id(test_db, user2.user_id)
        
        assert retrieved_user1.user_id == user1.user_id
        assert retrieved_user2.user_id == user2.user_id
        assert retrieved_user1.email == user1.email
        assert retrieved_user2.email == user2.email


class TestAuthenticateUser:
    """Test user authentication functionality."""

    def test_authenticate_user_correct_credentials(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test authentication with correct credentials."""
        user = authenticate_user(
            test_db,
            sample_user_data["email"],
            sample_user_data["password"],
        )
        
        assert user is not None
        assert user.user_id == db_user.user_id
        assert user.email == db_user.email

    def test_authenticate_user_wrong_password(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test authentication with wrong password returns None."""
        user = authenticate_user(
            test_db,
            sample_user_data["email"],
            "WrongPassword123!",
        )
        
        assert user is None

    def test_authenticate_user_nonexistent_email(self, test_db: Session):
        """Test authentication with non-existent email returns None."""
        user = authenticate_user(
            test_db,
            "nonexistent@example.com",
            "SomePassword123!",
        )
        
        assert user is None

    def test_authenticate_user_inactive_account(self, test_db: Session, inactive_user: User):
        """Test authentication with inactive account returns None."""
        user = authenticate_user(
            test_db,
            inactive_user.email,
            "InactivePass123!",
        )
        
        assert user is None

    def test_authenticate_user_empty_password(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test authentication with empty password returns None."""
        user = authenticate_user(
            test_db,
            sample_user_data["email"],
            "",
        )
        
        assert user is None

    def test_authenticate_user_empty_email(self, test_db: Session):
        """Test authentication with empty email returns None."""
        user = authenticate_user(
            test_db,
            "",
            "SomePassword123!",
        )
        
        assert user is None

    def test_authenticate_user_case_insensitive_email(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test authentication is case-insensitive for email."""
        user = authenticate_user(
            test_db,
            sample_user_data["email"].upper(),
            sample_user_data["password"],
        )
        
        assert user is not None
        assert user.user_id == db_user.user_id

    def test_authenticate_user_case_sensitive_password(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test authentication is case-sensitive for password."""
        user = authenticate_user(
            test_db,
            sample_user_data["email"],
            sample_user_data["password"].lower(),
        )
        
        assert user is None

    def test_authenticate_user_whitespace_in_credentials(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test authentication with whitespace in credentials."""
        # Trailing whitespace in email should fail (depends on implementation)
        user_with_space = authenticate_user(
            test_db,
            sample_user_data["email"] + " ",
            sample_user_data["password"],
        )
        
        # Should fail because email won't match
        assert user_with_space is None
        
        # Trailing whitespace in password should fail
        user_pass_space = authenticate_user(
            test_db,
            sample_user_data["email"],
            sample_user_data["password"] + " ",
        )
        
        assert user_pass_space is None


class TestUserCRUDEdgeCases:
    """Test edge cases and error conditions in CRUD operations."""

    def test_create_user_with_special_chars_in_email(self, test_db: Session):
        """Test creating user with special characters in email."""
        user_in = UserCreate(
            email="user+tag@example.co.uk",
            password="TestPassword123!",
        )
        
        user = create_user(test_db, user_in)
        
        assert user is not None
        assert user.email == "user+tag@example.co.uk"

    def test_get_user_by_email_with_special_chars(self, test_db: Session):
        """Test retrieving user with special characters in email."""
        user_in = UserCreate(
            email="user.name+tag@subdomain.example.com",
            password="TestPassword123!",
        )
        created_user = create_user(test_db, user_in)
        
        retrieved_user = get_user_by_email(test_db, "user.name+tag@subdomain.example.com")
        
        assert retrieved_user is not None
        assert retrieved_user.user_id == created_user.user_id

    def test_user_model_repr(self, test_db: Session, db_user: User):
        """Test User model __repr__ method."""
        repr_string = repr(db_user)
        
        assert "User" in repr_string
        assert str(db_user.user_id) in repr_string
        assert db_user.email in repr_string

    def test_user_attributes_accessible(self, test_db: Session, db_user: User):
        """Test that all user attributes are accessible."""
        assert hasattr(db_user, "user_id")
        assert hasattr(db_user, "email")
        assert hasattr(db_user, "password_hash")
        assert hasattr(db_user, "is_active")
        assert hasattr(db_user, "created_at")
        assert hasattr(db_user, "updated_at")

    def test_multiple_authenticate_attempts(self, test_db: Session, db_user: User, sample_user_data: dict):
        """Test multiple authentication attempts."""
        # Successful attempts
        for _ in range(3):
            user = authenticate_user(
                test_db,
                sample_user_data["email"],
                sample_user_data["password"],
            )
            assert user is not None

        # Failed attempts should not affect successful ones
        for _ in range(2):
            user = authenticate_user(
                test_db,
                sample_user_data["email"],
                "WrongPassword123!",
            )
            assert user is None

        # Should still be able to authenticate successfully
        user = authenticate_user(
            test_db,
            sample_user_data["email"],
            sample_user_data["password"],
        )
        assert user is not None

    def test_user_data_integrity_after_creation(self, test_db: Session):
        """Test that user data integrity is maintained."""
        user_in = UserCreate(
            email="integrity@example.com",
            password="IntegrityTest123!",
        )
        
        created_user = create_user(test_db, user_in)
        
        # Retrieve the user again
        retrieved_user = get_user_by_id(test_db, created_user.user_id)
        
        # All data should match
        assert retrieved_user.user_id == created_user.user_id
        assert retrieved_user.email == created_user.email
        assert retrieved_user.password_hash == created_user.password_hash
        assert retrieved_user.is_active == created_user.is_active
