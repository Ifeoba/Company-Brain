class BaseConnector:
    def send(self, message: str):
        raise NotImplementedError

    def receive(self):
        raise NotImplementedError
