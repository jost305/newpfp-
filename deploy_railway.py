import os
import subprocess

def run(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, env=os.environ, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error ({result.returncode}): {result.stderr}")
    else:
        print(result.stdout)
    return result.returncode == 0

os.environ["RAILWAY_TOKEN"] = "8867a49d-efd7-430e-89ae-7f6891bf986d"

# 1. Initialize Project (if not already linked)
print("Initializing Railway Project...")
run("npx @railway/cli init --name PumpBOTA")

# 2. Set Variables
print("Setting Environment Variables...")
if os.path.exists(".env.local"):
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                
                # Escape quotes for powershell/cmd execution
                v_escaped = v.replace('"', '\\"')
                run(f'npx @railway/cli variable set {k}="{v_escaped}" --skip-deploys')

# 3. Deploy
print("Deploying Project...")
run("npx @railway/cli up")
print("Deployment triggered. You can check the dashboard for progress!")
