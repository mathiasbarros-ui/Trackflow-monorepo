from pydantic import BaseModel


class ProfileResponse(BaseModel):
    id: str | None = None
    user_id: str | None = None
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class MessageResponse(BaseModel):
    message: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str


class LoginUserResponse(BaseModel):
    id: str
    email: str
    role: str


class LoginResponse(AccessTokenResponse):
    user: LoginUserResponse
    profile: ProfileResponse | None


class CurrentUserResponse(LoginUserResponse):
    profile: ProfileResponse | None


class RegistrationUserResponse(BaseModel):
    id: str
    is_active: bool
    role: str
    created_at: str


class RegistrationResponse(AccessTokenResponse):
    user: RegistrationUserResponse
    profile: ProfileResponse


class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    role: str
    created_at: str


class UserListResponse(BaseModel):
    id: str
    is_active: bool
    role: str
    created_at: str