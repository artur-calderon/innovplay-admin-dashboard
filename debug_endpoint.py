#!/usr/bin/env python3
"""
Script para debug do endpoint de correção
"""

import requests
import json

def test_endpoint():
    """Testa o endpoint com logs detalhados"""
    
    print("=== Teste do Endpoint de Correção ===")
    
    try:
        # Fazer requisição GET
        response = requests.get("http://localhost:5000/test-sessions/submitted")
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Sucesso! Endpoint funcionando.")
            print(f"Dados retornados: {len(data) if isinstance(data, list) else 'N/A'}")
        else:
            print(f"❌ Erro {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor.")
        print("Verifique se o backend está rodando em http://localhost:5000")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == "__main__":
    test_endpoint() 