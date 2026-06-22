# Backend/app/utils/response.py: contains backend logic for the Animal Breed Registry System.
def success(data=None, message="OK"):
    return {

        "success": True,

        "message": message,

        "data": data

    }

# Handles error logic for this module.
def error(message="Error"):
    return {

        "success": False,

        "message": message

    }
