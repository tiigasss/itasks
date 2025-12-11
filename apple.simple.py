from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Dados em memória (para demo)
users = [
    {
        'id': 1,
        'username': 'admin',
        'password': '123',
        'name': 'Administrador Sistema',
        'type': 'Gestor',
        'department': 'IT'
    },
    {
        'id': 2, 
        'username': 'joao',
        'password': '123',
        'name': 'João Silva',
        'type': 'Programador',
        'department': 'IT'
    }
]

tasks = [
    {
        'id': 1,
        'title': 'Desenvolver Sistema de Login',
        'description': 'Criar página de login com autenticação JWT',
        'state': 'ToDo',
        'order': 1,
        'programmer': 'João Silva',
        'programmer_id': 2,
        'manager_id': 1,
        'story_points': 5,
        'predicted_start_date': '2024-01-15',
        'predicted_end_date': '2024-01-20'
    },
    {
        'id': 2,
        'title': 'Design da Base de Dados',
        'description': 'Modelar e criar estrutura do banco de dados SQL', 
        'state': 'ToDo',
        'order': 2,
        'programmer': 'Ana Costa',
        'programmer_id': 3,
        'manager_id': 1,
        'story_points': 3,
        'predicted_start_date': '2024-01-16',
        'predicted_end_date': '2024-01-18'
    },
    {
        'id': 3,
        'title': 'Implementar API REST',
        'description': 'Desenvolver endpoints para o frontend',
        'state': 'Doing',
        'order': 1,
        'programmer': 'João Silva',
        'programmer_id': 2,
        'manager_id': 1,
        'story_points': 8,
        'predicted_start_date': '2024-01-10',
        'predicted_end_date': '2024-01-25',
        'real_start_date': '2024-01-12'
    },
    {
        'id': 4,
        'title': 'Testes Unitários',
        'description': 'Criar suite de testes automatizados',
        'state': 'Doing',
        'order': 2,
        'programmer': 'Maria Santos',
        'programmer_id': 4,
        'manager_id': 1,
        'story_points': 4,
        'predicted_start_date': '2024-01-08',
        'predicted_end_date': '2024-01-15',
        'real_start_date': '2024-01-09'
    },
    {
        'id': 5,
        'title': 'Documentação do Projeto',
        'description': 'Escrever documentação técnica',
        'state': 'Done',
        'order': 1,
        'programmer': 'Ana Costa',
        'programmer_id': 3,
        'manager_id': 1,
        'story_points': 2,
        'predicted_start_date': '2024-01-05',
        'predicted_end_date': '2024-01-08',
        'real_start_date': '2024-01-05',
        'real_end_date': '2024-01-07'
    }
]

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = next((u for u in users if u['username'] == username and u['password'] == password), None)
    if user:
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'name': user['name'],
                'type': user['type'],
                'department': user['department']
            }
        })
    else:
        return jsonify({'success': False, 'message': 'Credenciais inválidas'}), 401

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    return jsonify(tasks)

@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify(users)

@app.route('/api/tasks/<int:task_id>/move', methods=['POST'])
def move_task(task_id):
    data = request.get_json()
    new_state = data.get('state')
    
    task = next((t for t in tasks if t['id'] == task_id), None)
    if task:
        task['state'] = new_state
        return jsonify({'success': True, 'message': 'Tarefa movida'})
    else:
        return jsonify({'success': False, 'message': 'Tarefa não encontrada'}), 404

#  APENAS UMA FUNÇÃO create_task - remove a outra! luv u jojo
@app.route('/api/tasks', methods=['POST'])
def create_task():
    try:
        data = request.get_json()
        
        # Encontrar o próximo ID
        next_id = max([task['id'] for task in tasks]) + 1 if tasks else 1
        
        new_task = {
            'id': next_id,
            'title': data['title'],
            'description': data['description'],
            'state': 'ToDo',
            'order': data['order'],
            'programmer': 'João Silva',  # Em produção, buscaríamos pelo ID
            'programmer_id': data['programmer_id'],
            'manager_id': 1,  # ID do admin
            'story_points': data['story_points'],
            'predicted_start_date': data['predicted_start_date'],
            'predicted_end_date': data['predicted_end_date'],
            'real_start_date': None,
            'real_end_date': None
        }
        
        tasks.append(new_task)
        return jsonify({'success': True, 'message': 'Tarefa criada com sucesso', 'task': new_task})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

# Rota para buscar programadores luv u jojo e tiago martos
@app.route('/api/programmers', methods=['GET'])
def get_programmers():
    programmers = [user for user in users if user['type'] == 'Programador']
    return jsonify(programmers)

if __name__ == '__main__':
   
    app.run(debug=True, port=5000)