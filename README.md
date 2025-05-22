# 📖 自动小说生成工具

>- 目前开学了，没什么时间维护该项目，后续更新可能得等长假才能继续

<div align="center">
  
✨ **核心功能** ✨

| 功能模块          | 关键能力                          |
|-------------------|----------------------------------|
| 🎨 小说设定工坊    | 世界观架构 / 角色设定 / 剧情蓝图   |
| 📖 智能章节生成    | 多阶段生成保障剧情连贯性           |
| 🧠 状态追踪系统    | 角色发展轨迹 / 伏笔管理系统         |
| 🔍 语义检索引擎    | 基于向量的长程上下文一致性维护      |
| 📚 知识库集成      | 支持本地文档参考         |
| ✅ 自动审校机制    | 检测剧情矛盾与逻辑冲突          |
| 🖥 可视化工作台    | 全流程GUI操作，配置/生成/审校一体化 |

</div>

> 一款基于大语言模型的多功能小说生成器，助您高效创作逻辑严谨、设定统一的长篇故事

2025-03-05 添加角色库功能

2025-03-09 添加字数显示

2025-03-13 
1、新增闲云修改；
2、把本章指导改成内容指导；
3、在生成架构中的： 2. 角色动力学设定（角色弧光模型）、 3. 世界构建矩阵（三维度交织法）、 4. 情节架构（三幕式悬念）与生成目录的：5. 章节目录生成（悬念节奏曲线）加入引导词内容指导，以方便生成角色动力学时只以核心种子生成，导致生成的内容与实际需求不符。
4、在终端加回被删除的LLM提示词与LLM返回内容显示，以便复盘，参考修改提示词。
---

## 📑 目录导航
1. [环境准备](#-环境准备)  
2. [项目架构](#-项目架构)  
3. [配置指南](#⚙️-配置指南)  
4. [运行说明](#🚀-运行说明)  
5. [使用教程](#📘-使用教程)  
6. [疑难解答](#❓-疑难解答)  

---

## 🛠 环境准备
确保满足以下运行条件：
- **Python 3.9+** 运行环境（推荐3.10-3.12之间）
- **pip** 包管理工具
- 有效API密钥：
  - 云端服务：OpenAI / DeepSeek 等
  - 本地服务：Ollama 等兼容 OpenAI 的接口

---

## Web Application Setup and Usage

This project has been converted to a web application using Flask for the backend and Vue.js for the frontend.

**1. Getting the Code (Git):**

The latest version with the web interface is on the branch `web-conversion-vue-frontend`.

*   If you haven't cloned the repository yet:
    ```bash
    git clone <your_repository_url>
    cd <repository_directory>
    ```
    (Replace `<your_repository_url>` with the actual URL of the Git repository)
*   Fetch the latest changes and the new branch:
    ```bash
    git fetch origin
    ```
*   Checkout the new branch:
    ```bash
    git checkout web-conversion-vue-frontend
    ```
*   (Optional) To merge this into your main branch (e.g., `main`):
    ```bash
    git checkout main 
    git merge web-conversion-vue-frontend
    ```

**2. Environment Setup:**

*   **Navigate to Project Directory:** Open your terminal/command prompt and go to the project's root folder (where `app.py` is located).
*   **Python Version:** Ensure you have Python 3.9+ (Python 3.10 - 3.12 recommended).
*   **Python Virtual Environment (Recommended):**
    ```bash
    # Create virtual environment (run once per project)
    python -m venv venv 
    # Activate (do this every time you start working on the project)
    # On Windows:
    # venv\Scripts\activate
    # On macOS/Linux:
    # source venv/bin/activate
    ```
*   **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

**3. Running the Web Application:**

*   **Start the Flask Development Server:**
    ```bash
    python app.py
    ```
    You should see output indicating the server is running, typically on `http://127.0.0.1:5000/` or `http://0.0.0.0:5000/`.
*   **Access in Browser:** Open your web browser and navigate to the URL shown in your terminal (e.g., `http://127.0.0.1:5000/`).

**Important Considerations:**

*   **`config.json`:** This file stores API keys and model settings for LLMs and embedding models. If this file is missing or incomplete when you first run the application, you will need to configure these settings via the web UI's "Configuration Management" section. The application will create/update `config.json` when you save settings through the UI.
*   **`novel_projects` Directory:** The application will automatically create a `novel_projects` directory in the project root if it doesn't exist. This is where all generated novel data (architecture, blueprints, chapters, vector stores, etc.) will be stored for each project (e.g., `novel_projects/default_project/`).
*   **Development Server:** The `python app.py` command runs Flask's built-in development server. While convenient for local development and testing, for a production deployment, you would typically use a more robust WSGI server like Gunicorn or Waitress.
*   **Unit Tests:** The project includes unit tests for the backend API. You can run them with `python test_app.py` from the project root (ensure your virtual environment is active and dependencies are installed).

## Legacy Desktop App Installation (Archived)
1. **下载项目**  
   - 通过 [GitHub](https://github.com) 下载项目 ZIP 文件，或使用以下命令克隆本项目：
     ```bash
     git clone https://github.com/YILING0013/AI_NovelGenerator
     ```

2. **安装编译工具（可选）**  
   - 如果对某些包无法正常安装，访问 [Visual Studio Build Tools](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/) 下载并安装C++编译工具，用于构建部分模块包；
   - 安装时，默认只包含 MSBuild 工具，需手动勾选左上角列表栏中的 **C++ 桌面开发** 选项。

3. **安装依赖并运行**  
   - 打开终端，进入项目源文件目录：
     ```bash
     cd AI_NovelGenerator
     ```
   - 安装项目依赖：
     ```bash
     pip install -r requirements.txt
     ```
   - 安装完成后，运行主程序：
     ```bash
     python main.py 
     ```

>如果缺失部分依赖，后续**手动执行**
>```bash
>pip install XXX
>```
>进行安装即可

## 🗂 项目架构
```
novel-generator/
├── app.py                       # Web app entry point (Flask)
├── static/                      # Static files for web (CSS, JS)
├── templates/                   # HTML templates for web
├── novel_generator/             # Core novel generation logic
├── consistency_checker.py       # Consistency checking logic
|—— chapter_directory_parser.py  # Directory parsing
|—— embedding_adapters.py        # Embedding interface wrappers
|—— llm_adapters.py              # LLM interface wrappers
├── prompt_definitions.py        # Prompt templates
├── utils.py                     # Utility functions
├── config_manager.py            # Configuration management
├── test_app.py                  # API unit tests
├── config.json                  # User configuration (API keys, models)
├── requirements.txt             # Python dependencies
└── novel_projects/              # Default directory for generated novel data
```

---

## ⚙️ 配置指南
### 📌 基础配置（config.json）
```json
{
    "api_key": "sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "base_url": "https://api.openai.com/v1",
    "interface_format": "OpenAI",
    "model_name": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 4096,
    "embedding_api_key": "sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "embedding_interface_format": "OpenAI",
    "embedding_url": "https://api.openai.com/v1",
    "embedding_model_name": "text-embedding-ada-002",
    "embedding_retrieval_k": 4,
    "topic": "星穹铁道主角星穿越到原神提瓦特大陆，拯救提瓦特大陆，并与其中的角色展开爱恨情仇的小说",
    "genre": "玄幻",
    "num_chapters": 120,
    "word_number": 4000,
    "filepath": "D:/AI_NovelGenerator/filepath" 
}
```
**(Note: For the web application, `filepath` in `config.json` is less relevant as project paths are managed by the app, typically under `novel_projects/<project_name>/`. The UI allows managing LLM and embedding configs.)**

### 🔧 配置说明 
(Largely still relevant for understanding `config.json` which the web UI edits)
1. **生成模型配置**
   - `api_key`: 大模型服务的API密钥
   - `base_url`: API终端地址（本地服务填Ollama等地址）
   - `interface_format`: 接口模式
   - `model_name`: 主生成模型名称（如gpt-4, claude-3等）
   - `temperature`: 创意度参数（0-1，越高越有创造性）
   - `max_tokens`: 模型最大回复长度

2. **Embedding模型配置**
   - `embedding_model_name`: 模型名称（如Ollama的nomic-embed-text）
   - `embedding_url`: 服务地址
   - `embedding_retrieval_k`: 

3. **小说参数配置 (Primarily for initial setup, now managed via UI for generation steps)**
   - `topic`: 核心故事主题
   - `genre`: 作品类型
   - `num_chapters`: 总章节数
   - `word_number`: 单章目标字数
   - `filepath`: (Legacy, see note above)

---

## 🚀 运行说明 
**(This section is now covered by "Web Application Setup and Usage". The content below refers to the legacy desktop app.)**
### **方式 1：使用 Python 解释器**
```bash
python main.py # Legacy Desktop App
```
执行后，GUI 将会启动，你可以在图形界面中进行各项操作。

### **方式 2：打包为可执行文件**
如果你想在无 Python 环境的机器上使用本工具，可以使用 **PyInstaller** 进行打包：

```bash
pip install pyinstaller
pyinstaller main.spec # This spec file was for the old main.py
```
打包完成后，会在 `dist/` 目录下生成可执行文件（如 Windows 下的 `main.exe`）。

---

## 📘 使用教程 
**(This section describes the legacy desktop GUI. The new web interface has a similar workflow but different visual components.)**

1. **启动后，先完成基本参数设置：**  
   - **API Key & Base URL**（如 `https://api.openai.com/v1`）  
   - **模型名称**（如 `gpt-3.5-turbo`、`gpt-4o` 等）  
   - **Temperature** (0~1，决定文字创意程度)  
   - **主题(Topic)**（如 “废土世界的 AI 叛乱”）  
   - **类型(Genre)**（如 “科幻”/“魔幻”/“都市幻想”）  
   - **章节数**、**每章字数**（如 10 章，每章约 3000 字）  
   - **保存路径**（建议创建一个新的输出文件夹）

2. **点击「Step1. 生成设定」**  
   - 系统将基于主题、类型、章节数等信息，生成：  
     - `Novel_setting.txt`：包含世界观、角色信息、雷点暗线等。  
   - 可以在生成后的 `Novel_setting.txt` 中查看或修改设定内容。

3. **点击「Step2. 生成目录」**  
   - 系统会根据已完成的 `Novel_setting.txt` 内容，为全部章节生成：  
     - `Novel_directory.txt`：包括每章标题和简要提示。  
   - 可以在生成后的文件中查看、修改或补充章节标题和描述。

4. **点击「Step3. 生成章节草稿」**  
   - 在生成章节之前，你可以：  
     - **设置章节号**（如写第 1 章，就填 `1`）  
     - **在“本章指导”输入框**中提供对本章剧情的任何期望或提示  
   - 点击按钮后，系统将：  
     - 自动读取前文设定、`Novel_directory.txt`、以及已定稿章节  
     - 调用向量检索回顾剧情，保证上下文连贯  
     - 生成本章大纲 (`outline_X.txt`) 及正文 (`chapter_X.txt`)  
   - 生成完成后，你可在左侧的文本框查看、编辑本章草稿内容。

5. **点击「Step4. 定稿当前章节」**  
   - 系统将：  
     - **更新全局摘要**（写入 `global_summary.txt`）  
     - **更新角色状态**（写入 `character_state.txt`）  
     - **更新向量检索库**（保证后续章节可以调用最新信息）  
     - **更新剧情要点**（如 `plot_arcs.txt`）  
   - 定稿完成后，你可以在 `chapter_X.txt` 中看到定稿后的文本。

6. **一致性检查（可选）**  
   - 点击「[可选] 一致性审校」按钮，对最新章节进行冲突检测，如角色逻辑、剧情前后矛盾等。  
   - 若有冲突，会在日志区输出详细提示。

7. **重复第 4-6 步** 直到所有章节生成并定稿！

> **向量检索配置提示**  
> 1. embedding模型需要显示指定接口和模型名称；
> 2. 使用**本地Ollama**的**Embedding**时需提前启动Ollama服务：  
>    ```bash
>    ollama serve  # 启动服务
>    ollama pull nomic-embed-text  # 下载/启用模型
>    ```
> 3. 切换不同Embedding模型后建议清空vectorstore目录
> 4. 云端Embedding需确保对应API权限已开通

---

## ❓ 疑难解答
### Q1: Expecting value: line 1 column 1 (char 0)

该问题大概率由于API未正确响应造成，也许响应了一个html？其它内容，导致出现该报错；


### Q2: HTTP/1.1 504 Gateway Timeout？
确认接口是否稳定；

### Q3: 如何切换不同的Embedding提供商？
在GUI界面中对应输入即可。 (For web app, this is done via the "Configuration Management" section of the UI).

---

如有更多问题或需求，欢迎在**项目 Issues** 中提出。
