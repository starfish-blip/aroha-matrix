from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os

app = FastAPI()

class ComponentUpdate(BaseModel):
    component_name: str
    content: str

@app.post('/agent/update-component')
async def update_component(update: ComponentUpdate):
    try:
        os.makedirs('static/js', exist_ok=True)
        file_path = os.path.join('static', 'js', update.component_name) if update.component_name.endswith('.js') else os.path.join('static', 'components', update.component_name)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(update.content)
            
        return {'status': 'success', 'message': f'Successfully updated {update.component_name}'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=5000)

