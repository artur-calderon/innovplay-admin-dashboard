#!/usr/bin/env python3
"""
Script de teste para verificar o fluxo de correção de avaliações
"""

import requests
import json
from datetime import datetime

# Configurações
BASE_URL = "http://localhost:5000"
LOGIN_URL = f"{BASE_URL}/login"
SUBMITTED_URL = f"{BASE_URL}/test-sessions/submitted"
CORRECT_URL = f"{BASE_URL}/test-session"
FINALIZE_URL = f"{BASE_URL}/test-session"

def test_login():
    """Testa login para obter token"""
    print("🔐 Testando login...")
    
    login_data = {
        "registration": "moises@innovplay.com",
        "password": "12345678"
    }
    
    try:
        response = requests.post(LOGIN_URL, json=login_data)
        if response.status_code == 200:
            token = response.json().get('token')
            print(f"✅ Login bem-sucedido! Token obtido: {token[:20]}...")
            return token
        else:
            print(f"❌ Erro no login: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return None

def test_get_submitted_evaluations(token):
    """Testa busca de avaliações enviadas"""
    print("\n📋 Testando busca de avaliações enviadas...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(SUBMITTED_URL, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Avaliações encontradas: {len(data)}")
            
            if len(data) > 0:
                print("\n📊 Primeira avaliação:")
                first_eval = data[0]
                print(f"  - ID: {first_eval.get('id')}")
                print(f"  - Aluno: {first_eval.get('student_name')}")
                print(f"  - Avaliação: {first_eval.get('test_title')}")
                print(f"  - Status: {first_eval.get('status')}")
                print(f"  - Questões: {len(first_eval.get('answers', []))}")
                print(f"  - Enviado em: {first_eval.get('submitted_at')}")
                
                return first_eval
            else:
                print("⚠️ Nenhuma avaliação enviada encontrada")
                return None
        else:
            print(f"❌ Erro na busca: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return None

def test_correct_evaluation(token, session_id):
    """Testa correção de uma avaliação"""
    print(f"\n✏️ Testando correção da sessão {session_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Dados de correção de exemplo
    correction_data = {
        "questions": [
            {
                "question_id": "test-question-1",
                "is_correct": True,
                "manual_points": 1,
                "feedback": "Resposta correta!"
            }
        ],
        "final_score": 8,
        "percentage": 80,
        "general_feedback": "Bom trabalho! Demonstrou compreensão dos conceitos.",
        "status": "corrected"
    }
    
    try:
        response = requests.post(f"{CORRECT_URL}/{session_id}/correct", 
                               headers=headers, 
                               json=correction_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Correção salva com sucesso!")
            print(f"  - Sessão: {data.get('session_id')}")
            print(f"  - Nota final: {data.get('final_score')}")
            print(f"  - Percentual: {data.get('percentage')}%")
            return True
        else:
            print(f"❌ Erro na correção: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

def test_finalize_evaluation(token, session_id):
    """Testa finalização de uma avaliação"""
    print(f"\n✅ Testando finalização da sessão {session_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Dados de finalização
    finalize_data = {
        "questions": [
            {
                "question_id": "test-question-1",
                "is_correct": True,
                "manual_points": 1,
                "feedback": "Resposta correta!"
            }
        ],
        "final_score": 8,
        "percentage": 80,
        "general_feedback": "Bom trabalho! Demonstrou compreensão dos conceitos.",
        "status": "reviewed"
    }
    
    try:
        response = requests.post(f"{FINALIZE_URL}/{session_id}/finalize", 
                               headers=headers, 
                               json=finalize_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Avaliação finalizada com sucesso!")
            print(f"  - Sessão: {data.get('session_id')}")
            print(f"  - Nota final: {data.get('final_score')}")
            print(f"  - Percentual: {data.get('percentage')}%")
            print(f"  - Nível de proficiência: {data.get('proficiency_level')}")
            return True
        else:
            print(f"❌ Erro na finalização: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

def main():
    """Função principal de teste"""
    print("🧪 TESTE DO FLUXO DE CORREÇÃO DE AVALIAÇÕES")
    print("=" * 50)
    
    # 1. Login
    token = test_login()
    if not token:
        print("❌ Falha no login. Abortando teste.")
        return
    
    # 2. Buscar avaliações enviadas
    evaluation = test_get_submitted_evaluations(token)
    if not evaluation:
        print("❌ Nenhuma avaliação para testar. Abortando teste.")
        return
    
    session_id = evaluation.get('id')
    
    # 3. Testar correção
    correction_success = test_correct_evaluation(token, session_id)
    
    # 4. Testar finalização
    if correction_success:
        finalize_success = test_finalize_evaluation(token, session_id)
        
        if finalize_success:
            print("\n🎉 TODOS OS TESTES PASSARAM!")
            print("✅ O fluxo de correção está funcionando corretamente")
        else:
            print("\n❌ Teste de finalização falhou")
    else:
        print("\n❌ Teste de correção falhou")
    
    print("\n" + "=" * 50)
    print("🏁 Teste concluído!")

if __name__ == "__main__":
    main() 