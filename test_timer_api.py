#!/usr/bin/env python3
"""
Script para testar a API do cronômetro
"""

import requests
import json
import time
from datetime import datetime

# Configurações
BASE_URL = "http://localhost:5000"  # Ajuste conforme necessário
TEST_ID = "test-id-123"  # Substitua pelo ID real do teste

def test_timer_api():
    """Testa a API do cronômetro"""
    
    print("🧪 Testando API do Cronômetro")
    print("=" * 50)
    
    # 1. Testar conexão
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Conexão com API: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return
    
    # 2. Buscar informações da sessão
    print("\n📊 Buscando informações da sessão...")
    try:
        response = requests.get(f"{BASE_URL}/student-answers/test/{TEST_ID}/session")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Dados da sessão:")
            print(json.dumps(data, indent=2, default=str))
            
            # Verificar se o timer foi iniciado
            timer_started = data.get('timer_started', False)
            remaining_minutes = data.get('remaining_time_minutes', 0)
            actual_start_time = data.get('actual_start_time')
            
            print(f"\n⏱️ Status do Timer:")
            print(f"  - Timer iniciado: {timer_started}")
            print(f"  - Tempo restante: {remaining_minutes} minutos")
            print(f"  - Hora de início: {actual_start_time}")
            
            if timer_started and actual_start_time:
                print("✅ Timer já foi iniciado")
            else:
                print("⏸️ Timer não foi iniciado ainda")
                
        elif response.status_code == 404:
            print("ℹ️ Nenhuma sessão ativa encontrada")
        else:
            print(f"❌ Erro: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro ao buscar sessão: {e}")
    
    # 3. Se houver sessão, testar status
    print("\n🔄 Testando status da sessão...")
    try:
        # Primeiro buscar a sessão para obter o session_id
        response = requests.get(f"{BASE_URL}/student-answers/test/{TEST_ID}/session")
        if response.status_code == 200:
            session_data = response.json()
            session_id = session_data.get('session_id')
            
            if session_id:
                print(f"📋 Testando sessão: {session_id}")
                
                # Testar status várias vezes para ver se muda
                for i in range(5):
                    status_response = requests.get(f"{BASE_URL}/student-answers/sessions/{session_id}/status")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        remaining = status_data.get('remaining_time_minutes', 0)
                        is_expired = status_data.get('is_expired', False)
                        actual_start = status_data.get('actual_start_time')
                        
                        print(f"  {i+1}. Tempo restante: {remaining} min, Expirado: {is_expired}, Início: {actual_start}")
                        
                        if i < 4:  # Não esperar na última iteração
                            time.sleep(2)
                    else:
                        print(f"❌ Erro ao buscar status: {status_response.status_code}")
                        break
            else:
                print("❌ Session ID não encontrado")
        else:
            print("ℹ️ Nenhuma sessão para testar")
            
    except Exception as e:
        print(f"❌ Erro ao testar status: {e}")

if __name__ == "__main__":
    test_timer_api() 