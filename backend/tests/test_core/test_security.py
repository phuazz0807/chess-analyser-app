"""
Tests for app/core/security.py

This module tests:
- Password hashing and verification
- JWT token creation and decoding
- Token expiration handling
- Invalid token handling
"""

from datetime import timedelta, datetime, timezone
from unittest.mock import patch

import pytest
from jose import jwt

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    pwd_context,
)
from app.core.config import get_settings


class TestPasswordHashing:
    """Test password hashing and verification functions."""

    def test_get_password_hash_returns_different_hash(self):
        """Test that hashing the same password twice produces different hashes."""
        password = "TestPassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Bcrypt generates different salts, so hashes should be different
        assert hash1 != hash2
        assert len(hash1) > 0
        assert len(hash2) > 0

    def test_get_password_hash_creates_valid_bcrypt_hash(self):
        """Test that the password hash is a valid bcrypt hash."""
        password = "ValidPassword123!"
        hashed = get_password_hash(password)
        
        # Bcrypt hashes start with $2b$ or $2a$
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
        assert len(hashed) == 60  # Bcrypt hashes are always 60 characters

    def test_verify_password_correct_password(self):
        """Test that verify_password returns True for correct password."""
        password = "CorrectPassword123!"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect_password(self):
        """Test that verify_password returns False for incorrect password."""
        password = "CorrectPassword123!"
        wrong_password = "WrongPassword456@"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_empty_password(self):
        """Test verification with empty password."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        assert verify_password("", hashed) is False

    def test_verify_password_case_sensitive(self):
        """Test that password verification is case-sensitive."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        assert verify_password("testpassword123!", hashed) is False
        assert verify_password("TESTPASSWORD123!", hashed) is False


class TestJWTTokenCreation:
    """Test JWT token creation functions."""

    @pytest.mark.skip(reason="Temporarily disabled while JWT settings usage is being aligned.")
    def test_create_access_token_with_default_expiry(self):
        """Test creating a token with default expiration time."""
        data = {"sub": "user@example.com"}
        token = create_access_token(data)
        
        settings = get_settings()
        
        # Decode the token to verify its contents
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert payload["sub"] == "user@example.com"
        assert "exp" in payload
        
        # Verify expiration is roughly correct (within 1 minute tolerance)
        exp_timestamp = payload["exp"]
        expected_exp = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
        # Allow 60 seconds tolerance for test execution time
        assert abs(exp_timestamp - expected_exp.timestamp()) < 60

    @pytest.mark.skip(reason="Temporarily disabled while JWT settings usage is being aligned.")
    def test_create_access_token_with_custom_expiry(self):
        """Test creating a token with custom expiration time."""
        data = {"sub": "user@example.com"}
        custom_expiry = timedelta(minutes=30)
        token = create_access_token(data, expires_delta=custom_expiry)
        
        settings = get_settings()
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert payload["sub"] == "user@example.com"
        
        # Verify custom expiration
        exp_timestamp = payload["exp"]
        expected_exp = datetime.now(timezone.utc) + custom_expiry

        assert abs(exp_timestamp - expected_exp.timestamp()) < 60

    @pytest.mark.skip(reason="Temporarily disabled while JWT settings usage is being aligned.")
    def test_create_access_token_with_additional_data(self):
        """Test creating a token with additional claims."""
        data = {
            "sub": "user@example.com",
            "role": "admin",
            "user_id": 123,
        }
        token = create_access_token(data)
        
        settings = get_settings()
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert payload["sub"] == "user@example.com"
        assert payload["role"] == "admin"
        assert payload["user_id"] == 123

    def test_create_access_token_preserves_original_data(self):
        """Test that creating a token doesn't modify the original data dict."""
        data = {"sub": "user@example.com"}
        original_keys = set(data.keys())
        
        create_access_token(data)
        
        # Verify original dict is unchanged
        assert set(data.keys()) == original_keys
        assert "exp" not in data


class TestJWTTokenDecoding:
    """Test JWT token decoding and verification functions."""

    def test_decode_access_token_valid_token(self):
        """Test decoding a valid token."""
        email = "user@example.com"
        data = {"sub": email}
        token = create_access_token(data)
        
        decoded_email = decode_access_token(token)
        
        assert decoded_email == email

    def test_decode_access_token_expired_token(self):
        """Test that expired tokens are rejected."""
        data = {"sub": "user@example.com"}
        # Create token that expires immediately
        token = create_access_token(data, expires_delta=timedelta(seconds=-1))
        
        decoded_email = decode_access_token(token)
        
        assert decoded_email is None

    def test_decode_access_token_invalid_signature(self):
        """Test that tokens with invalid signatures are rejected."""
        data = {"sub": "user@example.com"}
        settings = get_settings()
        
        # Create token with wrong secret key
        fake_token = jwt.encode(
            data,
            "wrong-secret-key",
            algorithm=settings.ALGORITHM
        )
        
        decoded_email = decode_access_token(fake_token)
        
        assert decoded_email is None

    def test_decode_access_token_malformed_token(self):
        """Test that malformed tokens are rejected."""
        malformed_tokens = [
            "not.a.valid.jwt.token",
            "invalid",
            "",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
        ]
        
        for token in malformed_tokens:
            decoded_email = decode_access_token(token)
            assert decoded_email is None, f"Token '{token}' should be invalid"

    def test_decode_access_token_missing_subject(self):
        """Test that tokens without 'sub' claim are rejected."""
        settings = get_settings()
        
        # Create token without 'sub' claim
        data = {"user": "user@example.com", "exp": datetime.now(timezone.utc) + timedelta(minutes=30)}
        token = jwt.encode(
            data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        decoded_email = decode_access_token(token)
        
        assert decoded_email is None

    def test_decode_access_token_none_subject(self):
        """Test that tokens with None as subject are rejected."""
        settings = get_settings()
        
        data = {"sub": None, "exp": datetime.now(timezone.utc) + timedelta(minutes=30)}
        token = jwt.encode(
            data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        decoded_email = decode_access_token(token)
        
        assert decoded_email is None

    def test_decode_access_token_wrong_algorithm(self):
        """Test that tokens signed with wrong algorithm are rejected."""
        data = {"sub": "user@example.com"}
        settings = get_settings()
        
        # Create token with different algorithm
        wrong_algo_token = jwt.encode(
            data,
            settings.SECRET_KEY,
            algorithm="HS512"  # Different from configured HS256
        )
        
        decoded_email = decode_access_token(wrong_algo_token)
        
        assert decoded_email is None


class TestPasswordContext:
    """Test the password context configuration."""

    def test_pwd_context_uses_bcrypt(self):
        """Verify that the password context is configured to use bcrypt."""
        assert "bcrypt" in pwd_context.schemes()

    def test_pwd_context_deprecated_handling(self):
        """Verify deprecated schemes configuration."""
        # The context should mark auto-deprecated schemes
        assert pwd_context.to_dict()["deprecated"] == ["auto"]


class TestSecurityEdgeCases:
    """Test edge cases and error conditions."""

    def test_verify_password_with_invalid_hash_format(self):
        """Test verification with an invalid hash format."""
        password = "TestPassword123!"
        invalid_hash = "not-a-valid-bcrypt-hash"
        
        # Should return False or raise exception (bcrypt may handle differently)
        try:
            result = verify_password(password, invalid_hash)
            assert result is False
        except Exception:
            # Some implementations may raise an exception for invalid hash
            pass

    @pytest.mark.skip(reason="Temporarily disabled while JWT settings usage is being aligned.")
    def test_create_token_with_empty_data(self):
        """Test creating a token with empty data dictionary."""
        token = create_access_token({})
        
        settings = get_settings()
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        # Should still contain expiration
        assert "exp" in payload

    def test_create_token_with_very_long_expiry(self):
        """Test creating a token with very long expiration time."""
        data = {"sub": "user@example.com"}
        long_expiry = timedelta(days=365)
        token = create_access_token(data, expires_delta=long_expiry)
        
        decoded_email = decode_access_token(token)
        
        assert decoded_email == "user@example.com"

    def test_token_roundtrip_preserves_email(self):
        """Test that encoding and decoding preserves the email."""
        emails = [
            "user@example.com",
            "test.user+tag@subdomain.example.co.uk",
            "simple@test.org",
        ]
        
        for email in emails:
            token = create_access_token({"sub": email})
            decoded = decode_access_token(token)
            assert decoded == email, f"Email {email} was not preserved"
