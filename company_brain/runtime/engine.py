class RuntimeEngine:
    def __init__(self):
        self.workflows = []

    def register(self, workflow):
        self.workflows.append(workflow)

    def run(self):
        for workflow in self.workflows:
            workflow()
