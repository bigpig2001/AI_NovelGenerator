# app.py
# -*- coding: utf-8 -*-
import os
from flask import Flask, request, jsonify, render_template
from novel_generator import Novel_architecture_generate, Chapter_blueprint_generate, generate_chapter_draft, finalize_chapter
from novel_generator.knowledge import import_knowledge_file
from novel_generator.vectorstore_utils import clear_vector_store
from config_manager import load_config, save_config
from werkzeug.utils import secure_filename
import tempfile
from consistency_checker import check_consistency
from utils import read_file

app = Flask(__name__, template_folder='templates', static_folder='static')

# Configuration access functions to allow overrides for testing
def get_config_file_path():
    return app.config.get("CONFIG_FILE_OVERRIDE", "config.json")

def get_projects_base_path():
    return app.config.get("PROJECTS_BASE_PATH_OVERRIDE", "novel_projects")

# Helper to get LLM configuration
def get_llm_config():
    config = load_config(get_config_file_path())
    if not config:
        return None, None, "Config file not found or empty."
    last_llm_interface = config.get("last_interface_format", "OpenAI")
    llm_configs = config.get("llm_configs", {})
    if last_llm_interface not in llm_configs:
        return None, None, f"Configuration for '{last_llm_interface}' not found in llm_configs."
    current_llm_config = llm_configs[last_llm_interface]
    required_keys = ["api_key", "model_name", "temperature", "max_tokens", "timeout"]
    if last_llm_interface == "OpenAI": 
        required_keys.append("base_url")
    missing_keys = [key for key in required_keys if key not in current_llm_config or not current_llm_config[key]]
    if missing_keys:
        return None, None, f"LLM configuration for '{last_llm_interface}' is missing or has empty values for required keys: {', '.join(missing_keys)}."
    return current_llm_config, last_llm_interface, None

# Helper to get Embedding configuration
def get_embedding_config():
    config = load_config(get_config_file_path())
    if not config:
        return None, None, "Config file not found or empty."
    last_embedding_interface = config.get("last_embedding_interface_format", "OpenAI")
    embedding_configs = config.get("embedding_configs", {})
    if last_embedding_interface not in embedding_configs:
        return None, None, f"Configuration for '{last_embedding_interface}' not found in embedding_configs."
    current_embedding_config = embedding_configs[last_embedding_interface]
    required_keys = ["api_key", "model_name"]
    missing_keys = [key for key in required_keys if key not in current_embedding_config or not current_embedding_config[key]]
    if missing_keys:
        return None, None, f"Embedding configuration for '{last_embedding_interface}' is missing or has empty values for required keys: {', '.join(missing_keys)}."
    return current_embedding_config, last_embedding_interface, None

@app.route('/') 
def index():
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({"status": "ok", "message": "API is healthy"})

@app.route('/api/novel/architecture', methods=['POST'])
def generate_architecture_api():
    project_name = request.json.get("project_name", "default_project")
    filepath = os.path.join(get_projects_base_path(), project_name)
    try: os.makedirs(filepath, exist_ok=True)
    except OSError as e: return jsonify({"status": "error", "message": f"Could not create project directory: {str(e)}"}), 500
    llm_config, interface_format, error_msg = get_llm_config()
    if error_msg: return jsonify({"status": "error", "message": f"LLM Config Error: {error_msg}"}), 500
    data = request.get_json()
    if not data: return jsonify({"status": "error", "message": "Request body must be JSON."}), 400
    topic = data.get("topic", "A grand adventure")
    genre = data.get("genre", "Fantasy")
    num_chapters = int(data.get("num_chapters", 10)) 
    word_number = int(data.get("word_number", 3000)) 
    user_guidance = data.get("user_guidance", "")
    try:
        Novel_architecture_generate(
            interface_format=interface_format, api_key=llm_config["api_key"], base_url=llm_config.get("base_url"), 
            llm_model=llm_config["model_name"], temperature=float(llm_config["temperature"]),
            max_tokens=int(llm_config["max_tokens"]), timeout=int(llm_config["timeout"]),
            topic=topic, genre=genre, number_of_chapters=num_chapters, word_number=word_number,
            filepath=filepath, user_guidance=user_guidance
        )
        return jsonify({"status": "success", "message": "Novel architecture generated.", "filepath": filepath})
    except KeyError as e: return jsonify({"status": "error", "message": f"Missing key in LLM configuration: {str(e)}"}), 500
    except ValueError as e: return jsonify({"status": "error", "message": f"Invalid value in LLM configuration: {str(e)}"}), 500
    except Exception as e: return jsonify({"status": "error", "message": f"Error generating novel architecture: {str(e)}"}), 500

@app.route('/api/config', methods=['GET'])
def get_config_api():
    try:
        config_data = load_config(get_config_file_path())
        return jsonify(config_data)
    except Exception as e: return jsonify({"status": "error", "message": f"Error loading configuration: {str(e)}"}), 500

@app.route('/api/config', methods=['POST'])
def save_config_api():
    new_config_data = request.get_json()
    if not isinstance(new_config_data, dict): return jsonify({"status": "error", "message": "Invalid configuration format. Must be a JSON object."}), 400
    try:
        if save_config(new_config_data, get_config_file_path()): return jsonify({"status": "success", "message": "Configuration saved."})
        else: return jsonify({"status": "error", "message": "Failed to save configuration."}), 500
    except Exception as e: return jsonify({"status": "error", "message": f"Error saving configuration: {str(e)}"}), 500

@app.route('/api/novel/blueprint', methods=['POST'])
def generate_blueprint_api():
    project_name = request.json.get("project_name", "default_project")
    filepath = os.path.join(get_projects_base_path(), project_name)
    try: os.makedirs(filepath, exist_ok=True)
    except OSError as e: return jsonify({"status": "error", "message": f"Could not create project directory: {str(e)}"}), 500
    llm_config, interface_format, error_msg = get_llm_config()
    if error_msg: return jsonify({"status": "error", "message": f"LLM Config Error: {error_msg}"}), 500
    data = request.get_json()
    if not data: return jsonify({"status": "error", "message": "Request body must be JSON."}), 400
    num_chapters = data.get("num_chapters")
    if num_chapters is None: return jsonify({"status": "error", "message": "Missing 'num_chapters' in request."}), 400
    try: num_chapters = int(num_chapters)
    except ValueError: return jsonify({"status": "error", "message": "'num_chapters' must be an integer."}), 400
    user_guidance = data.get("user_guidance", "")
    try:
        Chapter_blueprint_generate(
            interface_format=interface_format, api_key=llm_config["api_key"], base_url=llm_config.get("base_url"), 
            llm_model=llm_config["model_name"], temperature=float(llm_config["temperature"]),
            max_tokens=int(llm_config["max_tokens"]), timeout=int(llm_config["timeout"]),
            filepath=filepath, number_of_chapters=num_chapters, user_guidance=user_guidance
        )
        return jsonify({"status": "success", "message": "Novel blueprint generated.", "filepath": filepath})
    except FileNotFoundError as fnf_error: return jsonify({"status": "error", "message": f"Prerequisite file not found: {str(fnf_error)}."}), 400
    except KeyError as e: return jsonify({"status": "error", "message": f"Missing key in LLM configuration: {str(e)}"}), 500
    except ValueError as e: return jsonify({"status": "error", "message": f"Invalid value in LLM configuration or request: {str(e)}"}), 500
    except Exception as e: return jsonify({"status": "error", "message": f"Error generating novel blueprint: {str(e)}"}), 500

@app.route('/api/novel/chapter_draft', methods=['POST'])
def generate_chapter_draft_api():
    project_name = request.json.get("project_name", "default_project")
    filepath = os.path.join(get_projects_base_path(), project_name)
    try: os.makedirs(filepath, exist_ok=True)
    except OSError as e: return jsonify({"status": "error", "message": f"Could not create project directory: {str(e)}"}), 500
    llm_config, llm_interface_format, llm_error_msg = get_llm_config()
    if llm_error_msg: return jsonify({"status": "error", "message": f"LLM Config Error: {llm_error_msg}"}), 500
    embedding_config, embedding_interface_format, embedding_error_msg = get_embedding_config()
    if embedding_error_msg: return jsonify({"status": "error", "message": f"Embedding Config Error: {embedding_error_msg}"}), 500
    data = request.get_json()
    if not data: return jsonify({"status": "error", "message": "Request body must be JSON."}), 400
    novel_number_str = data.get("novel_number")
    word_number_str = data.get("word_number")
    if novel_number_str is None or word_number_str is None: return jsonify({"status": "error", "message": "Missing 'novel_number' or 'word_number'."}), 400
    try:
        novel_number = int(novel_number_str)
        word_number = int(word_number_str)
    except ValueError: return jsonify({"status": "error", "message": "'novel_number' and 'word_number' must be integers."}), 400
    user_guidance = data.get("user_guidance", "")
    characters_involved = data.get("characters_involved", "")
    key_items = data.get("key_items", "")
    scene_location = data.get("scene_location", "")
    time_constraint = data.get("time_constraint", "")
    try: embedding_retrieval_k = int(data.get("embedding_retrieval_k", "4"))
    except ValueError: return jsonify({"status": "error", "message": "'embedding_retrieval_k' must be an integer."}), 400
    custom_prompt_text = data.get("custom_prompt_text")
    try:
        draft_text = generate_chapter_draft(
            api_key=llm_config["api_key"], base_url=llm_config.get("base_url"), model_name=llm_config["model_name"],
            temperature=float(llm_config["temperature"]), interface_format=llm_interface_format, 
            max_tokens=int(llm_config["max_tokens"]), timeout=int(llm_config["timeout"]),
            embedding_api_key=embedding_config["api_key"], embedding_url=embedding_config.get("base_url"),
            embedding_interface_format=embedding_interface_format, embedding_model_name=embedding_config["model_name"],
            embedding_retrieval_k=embedding_retrieval_k, filepath=filepath, novel_number=novel_number,
            word_number=word_number, user_guidance=user_guidance, characters_involved=characters_involved,
            key_items=key_items, scene_location=scene_location, time_constraint=time_constraint,
            custom_prompt_text=custom_prompt_text
        )
        if draft_text: return jsonify({"status": "success", "message": f"Chapter {novel_number} draft generated.", "filepath": filepath, "draft_text": draft_text})
        else: return jsonify({"status": "error", "message": "Chapter draft generation resulted in empty content."}), 500
    except FileNotFoundError as fnf_error: return jsonify({"status": "error", "message": f"Prerequisite file not found: {str(fnf_error)}."}), 400
    except KeyError as e: return jsonify({"status": "error", "message": f"Missing key in LLM or Embedding configuration: {str(e)}"}), 500
    except ValueError as e: return jsonify({"status": "error", "message": f"Invalid value in configuration or request parameters: {str(e)}"}), 500
    except Exception as e: return jsonify({"status": "error", "message": f"Error generating chapter draft: {str(e)}"}), 500

@app.route('/api/novel/finalize_chapter', methods=['POST'])
def finalize_chapter_api():
    project_name = request.json.get("project_name", "default_project")
    filepath = os.path.join(get_projects_base_path(), project_name)
    llm_config, llm_interface_format, llm_error_msg = get_llm_config()
    if llm_error_msg: return jsonify({"status": "error", "message": f"LLM Config Error: {llm_error_msg}"}), 500
    embedding_config, embedding_interface_format, embedding_error_msg = get_embedding_config()
    if embedding_error_msg: return jsonify({"status": "error", "message": f"Embedding Config Error: {embedding_error_msg}"}), 500
    data = request.get_json()
    if not data: return jsonify({"status": "error", "message": "Request body must be JSON."}), 400
    novel_number_str = data.get("novel_number")
    word_number_str = data.get("word_number")
    if novel_number_str is None or word_number_str is None: return jsonify({"status": "error", "message": "Missing 'novel_number' or 'word_number'."}), 400
    try:
        novel_number = int(novel_number_str)
        word_number = int(word_number_str)
    except ValueError: return jsonify({"status": "error", "message": "Invalid 'novel_number' or 'word_number', must be integers."}), 400
    try:
        finalize_chapter(
            api_key=llm_config["api_key"], base_url=llm_config.get("base_url"), model_name=llm_config["model_name"],
            temperature=float(llm_config["temperature"]), interface_format=llm_interface_format,
            max_tokens=int(llm_config["max_tokens"]), timeout=int(llm_config["timeout"]),
            embedding_api_key=embedding_config["api_key"], embedding_url=embedding_config.get("base_url"),
            embedding_interface_format=embedding_interface_format, embedding_model_name=embedding_config["model_name"],
            filepath=filepath, novel_number=novel_number, word_number=word_number
        )
        return jsonify({"status": "success", "message": f"Chapter {novel_number} finalized. Summaries, character states, and vector store updated.", "filepath": filepath})
    except FileNotFoundError as fnf_error: return jsonify({"status": "error", "message": f"Required file not found: {str(fnf_error)}."}), 400
    except KeyError as e: return jsonify({"status": "error", "message": f"Missing key in LLM or Embedding configuration: {str(e)}"}), 500
    except ValueError as e: return jsonify({"status": "error", "message": f"Invalid value in configuration or request parameters: {str(e)}"}), 500
    except Exception as e: return jsonify({"status": "error", "message": f"Error finalizing chapter: {str(e)}"}), 500

UPLOAD_FOLDER_TEMP = tempfile.gettempdir() 
ALLOWED_EXTENSIONS = {'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/knowledge/import', methods=['POST'])
def import_knowledge_api():
    if 'knowledge_file' not in request.files: return jsonify({"status": "error", "message": "No file part in the request."}), 400
    file = request.files['knowledge_file']
    if file.filename == '': return jsonify({"status": "error", "message": "No selected file."}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_file_path = os.path.join(UPLOAD_FOLDER_TEMP, filename)
        try:
            file.save(temp_file_path)
            project_name = request.form.get("project_name", "default_project")
            filepath = os.path.join(get_projects_base_path(), project_name)
            os.makedirs(filepath, exist_ok=True)
            embedding_config, embedding_interface_format, embedding_error_msg = get_embedding_config()
            if embedding_error_msg: return jsonify({"status": "error", "message": f"Embedding Config Error: {embedding_error_msg}"}), 500
            import_knowledge_file(
                embedding_api_key=embedding_config["api_key"], embedding_url=embedding_config.get("base_url"),
                embedding_interface_format=embedding_interface_format, embedding_model_name=embedding_config["model_name"],
                file_path=temp_file_path, filepath=filepath
            )
            return jsonify({"status": "success", "message": f"Knowledge file '{filename}' imported successfully to project '{project_name}'."})
        except Exception as e: return jsonify({"status": "error", "message": f"Error importing knowledge file: {str(e)}"}), 500
        finally:
            if os.path.exists(temp_file_path): os.remove(temp_file_path)
    else: return jsonify({"status": "error", "message": "File type not allowed. Only .txt files are accepted."}), 400

@app.route('/api/vectorstore/clear', methods=['POST'])
def clear_vectorstore_api():
    data = request.get_json()
    if not data: return jsonify({"status": "error", "message": "Request body must be JSON."}), 400
    project_name = data.get("project_name", "default_project")
    filepath = os.path.join(get_projects_base_path(), project_name)
    if not os.path.isdir(filepath): return jsonify({"status": "error", "message": f"Project directory '{filepath}' not found."}), 404
    try:
        if clear_vector_store(filepath): return jsonify({"status": "success", "message": f"Vector store for project '{project_name}' cleared."})
        else: return jsonify({"status": "error", "message": f"Failed to clear vector store for project '{project_name}'. The 'vectorstore' directory may still exist or be partially deleted."}), 500
    except Exception as e: return jsonify({"status": "error", "message": f"Error clearing vector store: {str(e)}"}), 500

@app.route('/api/novel/check_consistency', methods=['POST'])
def check_consistency_api():
    data = request.get_json()
    if not data: return jsonify({"status": "error", "message": "Request body must be JSON."}), 400
    project_name = data.get("project_name", "default_project")
    filepath = os.path.join(get_projects_base_path(), project_name) 
    chapter_number_str = data.get("chapter_number")
    if chapter_number_str is None: return jsonify({"status": "error", "message": "Missing 'chapter_number'."}), 400
    try: chapter_number = int(chapter_number_str)
    except ValueError: return jsonify({"status": "error", "message": "Invalid 'chapter_number', must be an integer."}), 400
    llm_config, llm_interface_format, llm_error_msg = get_llm_config()
    if llm_error_msg: return jsonify({"status": "error", "message": f"LLM Config Error: {llm_error_msg}"}), 500
    try:
        novel_setting_path = os.path.join(filepath, "Novel_architecture.txt")
        novel_setting_text = read_file(novel_setting_path)
        if not novel_setting_text: raise FileNotFoundError(f"Novel_architecture.txt not found or empty in '{filepath}'")
        character_state_path = os.path.join(filepath, "character_state.txt")
        character_state_text = read_file(character_state_path)
        if not character_state_text: raise FileNotFoundError(f"character_state.txt not found or empty in '{filepath}'")
        global_summary_path = os.path.join(filepath, "global_summary.txt")
        global_summary_text = read_file(global_summary_path)
        if not global_summary_text: raise FileNotFoundError(f"global_summary.txt not found or empty in '{filepath}'")
        chapter_file_path = os.path.join(filepath, "chapters", f"chapter_{chapter_number}.txt")
        chapter_text_content = read_file(chapter_file_path)
        if not chapter_text_content: raise FileNotFoundError(f"Chapter file '{chapter_file_path}' not found or empty.")
        plot_arcs_text = read_file(os.path.join(filepath, "plot_arcs.txt"))
    except FileNotFoundError as e: return jsonify({"status": "error", "message": f"Required file issue: {str(e)}"}), 404
    except Exception as e: return jsonify({"status": "error", "message": f"Error reading project files: {str(e)}"}), 500
    try:
        report = check_consistency(
            novel_setting=novel_setting_text, character_state=character_state_text, global_summary=global_summary_text,
            chapter_text=chapter_text_content, api_key=llm_config["api_key"], base_url=llm_config.get("base_url"),
            model_name=llm_config["model_name"], temperature=float(llm_config["temperature"]),
            interface_format=llm_interface_format, max_tokens=int(llm_config["max_tokens"]),
            timeout=int(llm_config["timeout"]), plot_arcs=plot_arcs_text
        )
        return jsonify({"status": "success", "consistency_report": report})
    except Exception as e: return jsonify({"status": "error", "message": f"Error during consistency check: {str(e)}"}), 500

@app.route('/api/novel/plot_arcs', methods=['GET'])
def get_plot_arcs_api():
    project_name = request.args.get("project_name", "default_project")
    filepath = os.path.join(get_projects_base_path(), project_name)
    plot_arcs_file_path = os.path.join(filepath, "plot_arcs.txt")
    try:
        plot_arcs_text = read_file(plot_arcs_file_path) 
        return jsonify({"status": "success", "project_name": project_name, "plot_arcs_text": plot_arcs_text})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error reading plot arcs file: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
