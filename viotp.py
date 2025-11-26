import requests
import json


class ViotpAPI:
    BASE_URL = "https://api.viotp.com"

    def __init__(self, token):
        self.token = token

    def _get(self, endpoint, params=None):
        if params is None:
            params = {}
        params["token"] = self.token
        url = f"{self.BASE_URL}{endpoint}"
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"status_code": -1, "message": str(e), "success": False}
        except json.JSONDecodeError:
            return {
                "status_code": -1,
                "message": "Invalid JSON response",
                "success": False,
            }

    def get_balance(self):
        """Tra cứu thông tin tài khoản"""
        return self._get("/users/balance")

    def get_networks(self):
        """Lấy danh sách nhà mạng"""
        return self._get("/networks/get")

    def get_services(self, country="vn"):
        """Lấy danh sách dịch vụ"""
        return self._get("/service/getv2", {"country": country})

    def request_service(
        self,
        service_id,
        network=None,
        prefix=None,
        except_prefix=None,
        number=None,
        country="vn",
    ):
        """Yêu cầu dịch vụ"""
        params = {"serviceId": service_id, "country": country}
        if network:
            params["network"] = network
        if prefix:
            params["prefix"] = prefix
        if except_prefix:
            params["exceptPrefix"] = except_prefix
        if number:
            params["number"] = number

        return self._get("/request/getv2", params)

    def get_session(self, request_id):
        """Lấy code của 1 số điện thoại đã lấy"""
        return self._get("/session/get", {"requestId": request_id})
