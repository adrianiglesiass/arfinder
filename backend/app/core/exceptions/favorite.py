from app.core.exceptions.base import AppError


class FavoriteError(AppError):
    pass


class FavoriteAlreadyExistsError(FavoriteError):
    status_code = 409
    default_detail = "Favorite already exists"


class FavoriteSelfError(FavoriteError):
    status_code = 400
    default_detail = "You cannot favorite your own profile"
