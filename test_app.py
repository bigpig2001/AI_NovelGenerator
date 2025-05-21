import unittest
import json
import os
import shutil # For cleaning up directories
from unittest.mock import patch # For mocking
from app import app # Assuming your Flask app instance is named 'app' in app.py

# Global for test paths
TEST_CONFIG_FILE = "test_config.json"
TEST_PROJECTS_BASE_PATH = "test_novel_projects"
TEST_DEFAULT_PROJECT_NAME = "default_project_test"
TEST_DEFAULT_PROJECT = os.path.join(TEST_PROJECTS_BASE_PATH, TEST_DEFAULT_PROJECT_NAME)

class TestAppAPI(unittest.TestCase):

    def setUp(self):
        app.testing = True
        self.client = app.test_client()

        # Override the app's config file path for testing
        app.config["CONFIG_FILE_OVERRIDE"] = TEST_CONFIG_FILE 
        # And project base path
        app.config["PROJECTS_BASE_PATH_OVERRIDE"] = TEST_PROJECTS_BASE_PATH

        # Create a dummy config file
        self.dummy_config_data = {
            "last_interface_format": "TestLLM",
            "llm_configs": {
                "TestLLM": {
                    "api_key": "test_key", "base_url": "http://localhost/test", 
                    "model_name": "test_model", "temperature": 0.5, 
                    "max_tokens": 100, "timeout": 60
                }
            },
            "last_embedding_interface_format": "TestEmbed",
            "embedding_configs": {
                "TestEmbed": {"api_key": "embed_key", "model_name": "embed_model"}
            },
            "other_params": {}
        }
        with open(TEST_CONFIG_FILE, 'w') as f:
            json.dump(self.dummy_config_data, f, indent=4)

        # Create test project directory
        os.makedirs(TEST_DEFAULT_PROJECT, exist_ok=True)

    def tearDown(self):
        if os.path.exists(TEST_CONFIG_FILE):
            os.remove(TEST_CONFIG_FILE)
        if os.path.exists(TEST_PROJECTS_BASE_PATH):
            shutil.rmtree(TEST_PROJECTS_BASE_PATH)
        
        # Remove overrides from app.config if they were set
        if "CONFIG_FILE_OVERRIDE" in app.config:
            del app.config["CONFIG_FILE_OVERRIDE"]
        if "PROJECTS_BASE_PATH_OVERRIDE" in app.config:
            del app.config["PROJECTS_BASE_PATH_OVERRIDE"]


    def test_get_config(self):
        response = self.client.get('/api/config')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data, self.dummy_config_data)

    def test_save_config(self):
        new_config = {
            "new_key": "new_value", 
            "llm_configs": self.dummy_config_data["llm_configs"], 
            "embedding_configs": self.dummy_config_data["embedding_configs"], 
            "last_interface_format": "TestLLM",
            "last_embedding_interface_format": "TestEmbed"
        }
        response = self.client.post('/api/config', json=new_config)
        self.assertEqual(response.status_code, 200)
        json_response = response.get_json()
        self.assertIn("Configuration saved", json_response["message"])

        # Verify by getting
        response = self.client.get('/api/config')
        self.assertEqual(response.status_code, 200)
        saved_data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(saved_data["new_key"], "new_value")
        self.assertEqual(saved_data["llm_configs"], self.dummy_config_data["llm_configs"])


    @patch('app.Novel_architecture_generate') # Mock the function in app.py
    def test_generate_architecture_success(self, mock_novel_arch_generate):
        # Configure the mock to simulate file creation
        def side_effect_novel_arch_generate(*args, **kwargs):
            filepath = kwargs.get("filepath")
            if filepath:
                os.makedirs(filepath, exist_ok=True) 
                with open(os.path.join(filepath, "Novel_architecture.txt"), "w") as f:
                    f.write("Test architecture content.")
                with open(os.path.join(filepath, "character_state.txt"), "w") as f:
                    f.write("Test character state.")
            return None 

        mock_novel_arch_generate.side_effect = side_effect_novel_arch_generate
        
        payload = {
            "project_name": TEST_DEFAULT_PROJECT_NAME, 
            "topic": "Test Topic",
            "genre": "Test Genre",
            "num_chapters": 3,
            "word_number": 100,
            "user_guidance": "Test guidance"
        }
        
        response = self.client.post('/api/novel/architecture', json=payload)
        self.assertEqual(response.status_code, 200) 
        json_response = response.get_json()
        self.assertEqual(json_response["status"], "success")
        self.assertEqual(json_response["filepath"], TEST_DEFAULT_PROJECT)
        
        # Check for output files
        self.assertTrue(os.path.exists(os.path.join(TEST_DEFAULT_PROJECT, "Novel_architecture.txt")))
        self.assertTrue(os.path.exists(os.path.join(TEST_DEFAULT_PROJECT, "character_state.txt")))
        
        mock_novel_arch_generate.assert_called_once()
        args, kwargs = mock_novel_arch_generate.call_args
        self.assertEqual(kwargs.get('filepath'), TEST_DEFAULT_PROJECT)


    def test_generate_architecture_missing_llm_config(self):
        # Temporarily corrupt the config for this test
        original_config_data = self.dummy_config_data.copy()
        bad_config_data = self.dummy_config_data.copy()
        # Remove a critical part, e.g. the specific LLM config for "TestLLM"
        if "TestLLM" in bad_config_data["llm_configs"]:
            del bad_config_data["llm_configs"]["TestLLM"]
        
        with open(TEST_CONFIG_FILE, 'w') as f:
            json.dump(bad_config_data, f, indent=4)

        payload = {
            "project_name": TEST_DEFAULT_PROJECT_NAME,
            "topic": "Test Topic", "genre": "Test Genre", 
            "num_chapters": 3, "word_number": 100
        }
        response = self.client.post('/api/novel/architecture', json=payload)
        self.assertEqual(response.status_code, 500)
        json_response = response.get_json()
        self.assertEqual(json_response["status"], "error")
        self.assertIn("LLM Config Error", json_response["message"])
        self.assertIn("Configuration for 'TestLLM' not found in llm_configs", json_response["message"])


        # Restore original config for other tests
        with open(TEST_CONFIG_FILE, 'w') as f:
            json.dump(original_config_data, f, indent=4)


if __name__ == '__main__':
    unittest.main()
