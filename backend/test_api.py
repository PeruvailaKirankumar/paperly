"""
Test script for the Paperly API
Run this after starting the server to test basic functionality
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"


def test_health_check():
    """Test the health check endpoint"""
    print("\n" + "="*50)
    print("Testing Health Check")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    print("✓ Health check passed")


def test_stats():
    """Test the stats endpoint"""
    print("\n" + "="*50)
    print("Testing Stats")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/stats")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    print("✓ Stats check passed")


def test_generate_questions_without_context():
    """Test question generation without document context"""
    print("\n" + "="*50)
    print("Testing Question Generation (No Context)")
    print("="*50)
    
    payload = {
        "topic": "Python Programming",
        "difficulty": "easy",
        "num_questions": 3,
        "question_types": ["mcq", "short_answer"],
        "use_context": False
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        f"{BASE_URL}/generate-questions",
        json=payload
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nGenerated Question Paper:")
        print(f"Title: {result['title']}")
        print(f"Difficulty: {result['difficulty']}")
        print(f"Total Marks: {result['total_marks']}")
        print(f"Number of Questions: {len(result['questions'])}")
        
        print("\nQuestions:")
        for q in result['questions']:
            print(f"\nQ{q['question_number']}. [{q['marks']} marks] {q['question_text']}")
            if q.get('sample_answer'):
                print(f"   Sample Answer: {q['sample_answer'][:100]}...")
        
        print("\n✓ Question generation (no context) passed")
    else:
        print(f"Error: {response.text}")


def test_upload_document_simulation():
    """Test document upload (simulation - requires actual file)"""
    print("\n" + "="*50)
    print("Testing Document Upload")
    print("="*50)
    
    print("NOTE: This test requires an actual PDF or PPTX file.")
    print("Create a test file named 'test_document.pdf' in the current directory to test.")
    print("Skipping actual upload test...")
    
    # Example code for when you have a file:
    # with open("test_document.pdf", "rb") as f:
    #     response = requests.post(
    #         f"{BASE_URL}/upload-document",
    #         files={"file": f}
    #     )
    #     print(f"Status Code: {response.status_code}")
    #     print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_list_documents():
    """Test listing documents"""
    print("\n" + "="*50)
    print("Testing List Documents")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/documents")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    print("✓ List documents passed")


def test_difficulty_levels():
    """Test all difficulty levels"""
    print("\n" + "="*50)
    print("Testing All Difficulty Levels")
    print("="*50)
    
    for difficulty in ["easy", "medium", "hard"]:
        print(f"\nTesting {difficulty.upper()} difficulty...")
        
        payload = {
            "topic": "Algorithms",
            "difficulty": difficulty,
            "num_questions": 2,
            "use_context": False
        }
        
        response = requests.post(
            f"{BASE_URL}/generate-questions",
            json=payload
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"  ✓ Generated {len(result['questions'])} questions")
            print(f"  Total marks: {result['total_marks']}")
        else:
            print(f"  ✗ Error: {response.status_code}")
        
        time.sleep(1)  # Rate limiting


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("PAPERLY API TEST SUITE")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print("Make sure the server is running: python main.py")
    print("="*60)
    
    try:
        test_health_check()
        test_stats()
        test_list_documents()
        test_generate_questions_without_context()
        test_difficulty_levels()
        test_upload_document_simulation()
        
        print("\n" + "="*60)
        print("ALL TESTS COMPLETED!")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to server")
        print("Make sure the server is running:")
        print("  cd backend")
        print("  python main.py")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
