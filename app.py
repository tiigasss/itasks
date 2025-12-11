from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from datetime import datetime
import time

app = Flask(__name__)
CORS(app) # Permite que o Angular comunique com o Python

# Configuração da Base de Dados
db_config = {
    'user': 'itasks', 
    'password': 'admin123',
    'host': 'localhost',
    'database': 'itasks_db'
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# --- ROTAS DE UTILIZADORES (UserService) ---

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, username, display_name as displayName, role, gestor_id as gestorId FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(users)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Nota: Em produção, use hashing para senhas (ex: bcrypt)!
    query = "SELECT id, username, display_name as displayName, role FROM users WHERE username = %s AND password = %s"
    cursor.execute(query, (data['username'], data['password']))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user:
        return jsonify({'user': user, 'token': 'fake-jwt-token'})
    return jsonify({'error': 'Credenciais inválidas'}), 401

# --- ROTAS DE TAREFAS (TaskService) ---

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Mapeamento de colunas snake_case (DB) para camelCase (Angular)
    query = """
        SELECT id, descricao, tipo_id as tipoId, gestor_id as gestorId, 
               programador_id as programadorId, ordem, estado, 
               data_criacao as dataCriacao, data_prevista_inicio as dataPrevistaInicio,
               data_prevista_fim as dataPrevistaFim, data_real_inicio as dataRealInicio,
               data_real_fim as dataRealFim, story_points as storyPoints
        FROM tasks ORDER BY ordem ASC
    """
    cursor.execute(query)
    tasks = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Migração da Regra de Negócio: Req 17 (Gestor não pode inserir duas tarefas com mesma ordem para mesmo prog)
    if data.get('programadorId'):
        cursor.execute("""
            SELECT id FROM tasks 
            WHERE programador_id = %s AND ordem = %s AND estado != 'Done'
        """, (data['programadorId'], data['ordem']))
        if cursor.fetchone():
            return jsonify({'error': f"O programador já tem uma tarefa ativa com a ordem {data['ordem']}"}), 400

    new_id = 'task' + str(int(time.time() * 1000)) # Exemplo de ID manual, igual ao frontend
    
    sql = """
        INSERT INTO tasks (id, descricao, tipo_id, gestor_id, programador_id, ordem, estado, story_points, data_prevista_inicio, data_prevista_fim)
        VALUES (%s, %s, %s, %s, %s, %s, 'ToDo', %s, %s, %s)
    """
    vals = (
        new_id, data['descricao'], data['tipoId'], data['gestorId'], 
        data.get('programadorId'), data.get('ordem', 1), data.get('storyPoints'),
        data.get('dataPrevistaInicio'), data.get('dataPrevistaFim')
    )
    
    cursor.execute(sql, vals)
    conn.commit()
    cursor.close()
    conn.close()
    
    return jsonify({'id': new_id, 'message': 'Tarefa criada'})

@app.route('/api/tasks/<task_id>/move', methods=['PUT'])
def move_task(task_id):
    data = request.json
    novo_estado = data['novoEstado']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Buscar tarefa atual
    cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
    task = cursor.fetchone()
    if not task:
        return jsonify({'error': 'Tarefa não encontrada'}), 404

    # --- Migração da Lógica canMoveTo ---
    if task['estado'] == 'Done':
        return jsonify({'error': 'Tarefas concluídas estão bloqueadas'}), 400

    if novo_estado == 'Doing' and task['programador_id']:
        # Regra: Max 2 tarefas em Doing
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE programador_id = %s AND estado = 'Doing' AND id != %s", (task['programador_id'], task_id))
        if cursor.fetchone()['count'] >= 2:
            return jsonify({'error': 'Limite de 2 tarefas em curso atingido.'}), 400
        
        # Regra: Ordem Sequencial (Existe alguma tarefa com ordem menor ainda em ToDo?)
        cursor.execute("""
            SELECT id FROM tasks 
            WHERE programador_id = %s AND estado = 'ToDo' AND ordem < %s AND id != %s
        """, (task['programador_id'], task['ordem'], task_id))
        if cursor.fetchone():
            return jsonify({'error': 'Deve concluir as tarefas por ordem. Existe tarefa de ordem inferior pendente.'}), 400

    # Atualizar estado e datas
    now = datetime.now()
    update_query = "UPDATE tasks SET estado = %s"
    params = [novo_estado]

    if novo_estado == 'Doing' and not task['data_real_inicio']:
        update_query += ", data_real_inicio = %s"
        params.append(now)
    
    if novo_estado == 'Done':
        update_query += ", data_real_fim = %s"
        params.append(now)

    update_query += " WHERE id = %s"
    params.append(task_id)

    cursor.execute(update_query, tuple(params))
    conn.commit()
    cursor.close()
    conn.close()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)