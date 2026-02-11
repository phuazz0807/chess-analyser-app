# Python BE

## How to run (on WSL2s)
1. Ensure you have Python installed, currently on 3.10 for this.
2. Create a python virtual env: `python -m venv chess-app-env`
3. Activate it: `source chess-app-env/bin/activate` (or Scripts instead of bin if on Windows Git Bash)
4. Install the requirements: `pip3 install -r requirements.txt`
5. Run the uvicorn local server: `uvicorn main:app --reload`
6. Test the endpoint(s) on SwaggerUI (localhost:8000/docs)
