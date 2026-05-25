class Executor:
    def execute(self, task, context=None):
        print(f"[Executor] Running task: {task}")
        return {"status": "success", "task": task}
