"""
Shared MongoDB connection helper.

On macOS the python.org Python does not use the system certificate store, so
connecting to MongoDB Atlas fails with
    [SSL: CERTIFICATE_VERIFY_FAILED] unable to get local issuer certificate
Using certifi's CA bundle fixes this on every OS (Windows, macOS, Linux).
"""

from pymongo import MongoClient


def _uses_tls(uri):
    lowered = uri.lower()
    return lowered.startswith("mongodb+srv://") or "tls=true" in lowered or "ssl=true" in lowered


def mongo_client(uri, **kwargs):
    if _uses_tls(uri) and "tlsCAFile" not in kwargs:
        try:
            import certifi
            kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            print("Tip: 'pip install certifi' if MongoDB Atlas gives CERTIFICATE_VERIFY_FAILED")
    return MongoClient(uri, **kwargs)
