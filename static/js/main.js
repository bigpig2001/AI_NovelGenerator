// static/js/main.js
const { createApp, ref, reactive, onMounted } = Vue; // ref, reactive, onMounted might be useful for more complex components later

const ConfigManager = {
    data() {
        return {
            configData: null,
            rawConfigEdit: '',
            isLoading: false,
            error: null,
            fetchRetries: 0,
            saveRetries: 0,
            MAX_RETRIES: 3,
            statusMessage: '' // For success/error messages from save
        };
    },
    methods: {
        async fetchConfig(isRetry = false) {
            this.isLoading = true;
            this.error = null;
            this.statusMessage = '';
            if (!isRetry) this.fetchRetries = 0;

            try {
                const response = await fetch('/api/config');
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch config, unknown error.' }));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                this.configData = await response.json();
                this.rawConfigEdit = JSON.stringify(this.configData, null, 2);
                this.statusMessage = 'Config loaded successfully.';
            } catch (e) {
                this.error = `Fetch error: ${e.message}`;
                if (this.fetchRetries < this.MAX_RETRIES) {
                    // UI should show a retry button if this.error is set and retries are available
                } else {
                    this.statusMessage = `Failed to load config after ${this.MAX_RETRIES} retries.`;
                }
            } finally {
                this.isLoading = false;
            }
        },
        async saveConfig(isRetry = false) {
            this.isLoading = true;
            this.error = null;
            this.statusMessage = '';
            if (!isRetry) this.saveRetries = 0;

            let parsedConfig;
            try {
                parsedConfig = JSON.parse(this.rawConfigEdit);
            } catch (e) {
                this.error = 'Invalid JSON format in textarea.';
                this.isLoading = false;
                return;
            }

            try {
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsedConfig) // Send the parsed (and thus validated) JSON
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Failed to save config, unknown error.' }));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                this.statusMessage = result.message || 'Config saved successfully!';
                await this.fetchConfig(); // Reload after save
            } catch (e) {
                this.error = `Save error: ${e.message}`;
                 if (this.saveRetries < this.MAX_RETRIES) {
                    // UI should show a retry button
                } else {
                    this.statusMessage = `Failed to save config after ${this.MAX_RETRIES} retries.`;
                }
            } finally {
                this.isLoading = false;
            }
        },
        // These are called by buttons shown conditionally in the template
        attemptFetchRetry() {
            if (this.fetchRetries < this.MAX_RETRIES) {
                this.fetchRetries++;
                this.fetchConfig(true);
            }
        },
        attemptSaveRetry() {
            if (this.saveRetries < this.MAX_RETRIES) {
                this.saveRetries++;
                this.saveConfig(true);
            }
        }
    },
    mounted() {
        this.fetchConfig();
    },
    template: `
        <div class="config-manager">
            <h3>Configuration Management</h3>
            <div v-if="isLoading">Loading...</div>
            <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
            <div v-if="error" class="error-message">
                <p>Error: {{ error }}</p>
                <button v-if="error.startsWith('Fetch error') && fetchRetries < MAX_RETRIES" @click="attemptFetchRetry">Retry Load ({{ fetchRetries }}/{{ MAX_RETRIES }})</button>
                <button v-if="error.startsWith('Save error') && saveRetries < MAX_RETRIES" @click="attemptSaveRetry">Retry Save ({{ saveRetries }}/{{ MAX_RETRIES }})</button>
            </div>
            <textarea v-model="rawConfigEdit" rows="20" cols="80" :disabled="isLoading"></textarea>
            <div>
                <button @click="fetchConfig(false)" :disabled="isLoading">Reload Config from Server</button>
                <button @click="saveConfig(false)" :disabled="isLoading">Save Config to Server</button>
            </div>
        </div>
    `
};

const ProjectSetup = {
    data() {
        return {
            projectName: 'default_project', // For now, this is fixed.
            topic: '',
            genre: 'Fantasy',
            numChapters: 10,
            wordCount: 3000, // Per chapter
            userGuidance: ''
        };
    },
    emits: ['project-details-submitted'], // Declare emitted events
    methods: {
        submitProjectDetails() {
            this.$emit('project-details-submitted', {
                projectName: this.projectName,
                topic: this.topic,
                genre: this.genre,
                numChapters: parseInt(this.numChapters) || 10,
                wordCount: parseInt(this.wordCount) || 3000,
                userGuidance: this.userGuidance
            });
        }
    },
    template: `
        <div class="project-setup">
            <h3>Project Setup</h3>
            <form @submit.prevent="submitProjectDetails">
                <div>
                    <label for="projectName">Project Name: </label>
                    <input type="text" id="projectName" v-model="projectName" disabled> 
                </div>
                <div>
                    <label for="topic">Topic/Theme: </label>
                    <input type="text" id="topic" v-model="topic" required>
                </div>
                <div>
                    <label for="genre">Genre: </label>
                    <input type="text" id="genre" v-model="genre">
                </div>
                <div>
                    <label for="numChapters">Number of Chapters: </label>
                    <input type="number" id="numChapters" v-model.number="numChapters" min="1">
                </div>
                <div>
                    <label for="wordCount">Approx. Words per Chapter: </label>
                    <input type="number" id="wordCount" v-model.number="wordCount" min="100">
                </div>
                <div>
                    <label for="userGuidance">User Guidance/Core Ideas: </label>
                    <textarea id="userGuidance" v-model="userGuidance" rows="4"></textarea>
                </div>
                <button type="submit">Set Project Details & Proceed</button>
            </form>
        </div>
    `
};

const ArchitectureGenerator = {
    props: {
        projectDetails: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            isLoading: false,
            error: null,
            statusMessage: '',
            apiRetries: 0,
            MAX_RETRIES: 3,
            showConfirmation: false
        };
    },
    computed: {
        canRetryApi() {
            return this.error && this.apiRetries < this.MAX_RETRIES;
        }
    },
    methods: {
        initiateGeneration() {
            this.showConfirmation = true;
            this.statusMessage = '';
            this.error = null;
        },
        cancelGeneration() {
            this.showConfirmation = false;
        },
        async confirmAndGenerate(isRetry = false) {
            this.showConfirmation = false;
            this.isLoading = true;
            this.error = null;
            this.statusMessage = '';
            if (!isRetry) {
                this.apiRetries = 0;
            }

            try {
                const payload = {
                    project_name: this.projectDetails.projectName, // API expects project_name
                    topic: this.projectDetails.topic,
                    genre: this.projectDetails.genre,
                    num_chapters: this.projectDetails.numChapters,
                    word_number: this.projectDetails.wordCount,
                    user_guidance: this.projectDetails.userGuidance
                };
                const response = await fetch('/api/novel/architecture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
                }
                this.statusMessage = responseData.message || 'Architecture generation started successfully.';
                // Optionally, you could emit an event here if App needs to know generation is done/started
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },
        attemptApiRetry() {
            if (this.canRetryApi) { // Use computed property
                this.apiRetries++;
                this.confirmAndGenerate(true);
            }
        }
    },
    template: `
        <div class="architecture-generator">
            <h4>Architecture Generation</h4>
            <p><strong>Project:</strong> {{ projectDetails.projectName }}</p>
            <p><strong>Topic:</strong> {{ projectDetails.topic }}</p>
            
            <button @click="initiateGeneration" :disabled="isLoading || showConfirmation">Generate Novel Architecture</button>

            <div v-if="showConfirmation" class="confirmation-dialog">
                <p><strong>Confirm Generation for:</strong></p>
                <p>Topic: {{ projectDetails.topic }}</p>
                <p>Genre: {{ projectDetails.genre }}</p>
                <p>Chapters: {{ projectDetails.numChapters }}</p>
                <p>Words/Chapter: {{ projectDetails.wordCount }}</p>
                <p>Guidance: {{ projectDetails.userGuidance ? projectDetails.userGuidance.substring(0, 100) + (projectDetails.userGuidance.length > 100 ? '...' : '') : 'N/A' }}</p>
                <button @click="confirmAndGenerate(false)" :disabled="isLoading">Confirm & Generate</button>
                <button @click="cancelGeneration" :disabled="isLoading">Cancel</button>
            </div>

            <div v-if="isLoading">Generating architecture...</div>
            <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
            <div v-if="error" class="error-message">
                <p>Error: {{ error }}</p>
                <button v-if="canRetryApi" @click="attemptApiRetry">Retry API Call ({{ apiRetries }}/{{ MAX_RETRIES }})</button>
            </div>
        </div>
    `
};

const BlueprintGenerator = {
    props: {
        projectDetails: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            isLoading: false,
            error: null,
            statusMessage: '',
            apiRetries: 0,
            MAX_RETRIES: 3,
            showConfirmation: false
        };
    },
    computed: {
        canRetryApi() {
            return this.error && this.apiRetries < this.MAX_RETRIES;
        }
    },
    methods: {
        initiateGeneration() {
            this.showConfirmation = true;
            this.statusMessage = '';
            this.error = null;
        },
        cancelGeneration() {
            this.showConfirmation = false;
        },
        async confirmAndGenerate(isRetry = false) {
            this.showConfirmation = false;
            this.isLoading = true;
            this.error = null;
            this.statusMessage = '';
            if (!isRetry) {
                this.apiRetries = 0;
            }

            try {
                const payload = {
                    project_name: this.projectDetails.projectName,
                    num_chapters: this.projectDetails.numChapters, // API expects num_chapters
                    user_guidance: this.projectDetails.userGuidance 
                };
                const response = await fetch('/api/novel/blueprint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
                }
                this.statusMessage = responseData.message || 'Blueprint generation started successfully.';
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },
        attemptApiRetry() {
            if (this.canRetryApi) {
                this.apiRetries++;
                this.confirmAndGenerate(true);
            }
        }
    },
    template: `
        <div class="blueprint-generator">
            <h4>Chapter Blueprint Generation</h4>
            <p>Uses settings from current project ({{ projectDetails.projectName }}).</p>
            
            <button @click="initiateGeneration" :disabled="isLoading || showConfirmation">Generate Chapter Blueprint</button>

            <div v-if="showConfirmation" class="confirmation-dialog">
                <p><strong>Confirm Blueprint Generation for:</strong></p>
                <p>Project: {{ projectDetails.projectName }}</p>
                <p>Number of Chapters: {{ projectDetails.numChapters }}</p>
                <p>User Guidance: {{ (projectDetails.userGuidance || 'N/A').substring(0,100) }}...</p>
                <button @click="confirmAndGenerate(false)" :disabled="isLoading">Confirm & Generate Blueprint</button>
                <button @click="cancelGeneration" :disabled="isLoading">Cancel</button>
            </div>

            <div v-if="isLoading">Generating blueprint...</div>
            <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
            <div v-if="error" class="error-message">
                <p>Error: {{ error }}</p>
                <button v-if="canRetryApi" @click="attemptApiRetry">Retry API Call ({{ apiRetries }}/{{ MAX_RETRIES }})</button>
            </div>
        </div>
    `
};

const ChapterDraftGenerator = {
    props: {
        projectDetails: { type: Object, required: true }
    },
    emits: ['draft-completed'], // Declare emitted events
    data() {
        return {
            chapterInputs: {
                novelNumber: 1,
                wordNumber: 3000, // Default, will be updated by watcher/mounted
                userGuidance: '', 
                charactersInvolved: '',
                keyItems: '',
                sceneLocation: '',
                timeConstraint: '',
                embeddingRetrievalK: 4,
                customPromptText: ''
            },
            generatedDraftText: '',
            isLoading: false,
            error: null,
            statusMessage: '',
            apiRetries: 0,
            MAX_RETRIES: 3,
            showConfirmation: false
        };
    },
    computed: {
        canRetryApi() { 
            return this.error && this.apiRetries < this.MAX_RETRIES;
        }
    },
    methods: {
        setInitialInputs() { 
            if (this.projectDetails) {
                this.chapterInputs.wordNumber = this.projectDetails.wordCount || 3000;
            }
        },
        resetChapterInputsFromProject() { 
            if (this.projectDetails) {
                this.chapterInputs.wordNumber = this.projectDetails.wordCount || 3000;
                this.chapterInputs.userGuidance = this.projectDetails.userGuidance || ''; 
            }
        },
        initiateGeneration() { 
            this.showConfirmation = true; 
            this.statusMessage = ''; 
            this.error = null; 
            this.generatedDraftText = '';
        },
        cancelGeneration() { 
            this.showConfirmation = false; 
        },
        async confirmAndGenerate(isRetry = false) {
            this.showConfirmation = false;
            this.isLoading = true;
            this.error = null;
            this.statusMessage = '';
            this.generatedDraftText = '';
            if (!isRetry) this.apiRetries = 0;

            try {
                const payload = {
                    project_name: this.projectDetails.projectName,
                    novel_number: parseInt(this.chapterInputs.novelNumber) || 1,
                    word_number: parseInt(this.chapterInputs.wordNumber) || 3000,
                    user_guidance: this.chapterInputs.userGuidance,
                    characters_involved: this.chapterInputs.charactersInvolved,
                    key_items: this.chapterInputs.keyItems,
                    scene_location: this.chapterInputs.sceneLocation,
                    time_constraint: this.chapterInputs.timeConstraint,
                    embedding_retrieval_k: parseInt(this.chapterInputs.embeddingRetrievalK) || 4,
                    custom_prompt_text: this.chapterInputs.customPromptText
                };
                const response = await fetch('/api/novel/chapter_draft', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload) 
                });
                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.message || 'Error generating draft.');
                
                this.generatedDraftText = responseData.draft_text || '';
                this.statusMessage = responseData.message || 'Draft generated successfully.';
                
                this.$emit('draft-completed', { 
                    novelNumber: parseInt(this.chapterInputs.novelNumber), 
                    draftText: this.generatedDraftText 
                });

            } catch (e) { 
                this.error = e.message; 
            } 
            finally { this.isLoading = false; }
        },
        attemptApiRetry() { 
            if (this.canRetryApi) {
                this.apiRetries++;
                this.confirmAndGenerate(true);
            }
        }
    },
    watch: {
        projectDetails: { 
            handler: 'setInitialInputs',
            immediate: true, 
            deep: true 
        }
    },
    template: `
        <div class="chapter-draft-generator">
            <h4>Chapter Draft Generation</h4>
            <form @submit.prevent="initiateGeneration">
                <div><label>Chapter Number: <input type="number" v-model.number="chapterInputs.novelNumber" min="1"></label></div>
                <div>
                    <label>Target Word Count: <input type="number" v-model.number="chapterInputs.wordNumber" min="100"></label>
                </div>
                <div>
                    <label>Chapter-Specific Guidance: <textarea v-model="chapterInputs.userGuidance" rows="3"></textarea></label>
                </div>
                <div><button type="button" @click="resetChapterInputsFromProject">Copy Word Count & Guidance from Project Setup</button></div>
                <div><label>Characters Involved: <input type="text" v-model="chapterInputs.charactersInvolved"></label></div>
                <div><label>Key Items: <input type="text" v-model="chapterInputs.keyItems"></label></div>
                <div><label>Scene Location: <input type="text" v-model="chapterInputs.sceneLocation"></label></div>
                <div><label>Time Constraint: <input type="text" v-model="chapterInputs.timeConstraint"></label></div>
                <div><label>Embedding Retrieval K: <input type="number" v-model.number="chapterInputs.embeddingRetrievalK" min="1"></label></div>
                <div>
                    <label>Custom Full Prompt (Optional - overrides above settings for prompt building):</label>
                    <textarea v-model="chapterInputs.customPromptText" rows="5"></textarea>
                </div>
                <button type="submit" :disabled="isLoading || showConfirmation">Generate Chapter Draft</button>
            </form>

            <div v-if="showConfirmation" class="confirmation-dialog">
                <p><strong>Confirm Draft Generation for Chapter {{ chapterInputs.novelNumber }}?</strong></p>
                <p>Word Count: {{ chapterInputs.wordNumber }}</p>
                <p>Guidance: {{ (chapterInputs.userGuidance || 'N/A').substring(0,100) }}...</p>
                <button @click="confirmAndGenerate(false)" :disabled="isLoading">Confirm & Generate</button>
                <button @click="cancelGeneration" :disabled="isLoading">Cancel</button>
            </div>
            
            <div v-if="isLoading">Generating draft...</div>
            <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
            <div v-if="error" class="error-message">Error: {{ error }} <button v-if="canRetryApi" @click="attemptApiRetry">Retry</button></div>
            
            <div v-if="generatedDraftText">
                <h5>Generated Draft (Chapter {{ chapterInputs.novelNumber }}):</h5>
                <textarea v-model="generatedDraftText" readonly rows="15" style="width: 95%;"></textarea>
            </div>
        </div>
    `
};

const ChapterFinalizer = {
    props: {
        projectDetails: { type: Object, required: true },
        chapterNumberToFinalize: { type: Number, required: true }
    },
    emits: ['chapter-finalized'],
    data() {
        return {
            isLoading: false,
            error: null,
            statusMessage: '',
            apiRetries: 0,
            MAX_RETRIES: 3,
            showConfirmation: false
        };
    },
    computed: {
        canRetryApi() {
            return this.error && this.apiRetries < this.MAX_RETRIES;
        }
    },
    methods: {
        initiateFinalization() {
            this.showConfirmation = true;
            this.statusMessage = '';
            this.error = null;
        },
        cancelFinalization() {
            this.showConfirmation = false;
        },
        async confirmAndFinalize(isRetry = false) {
            this.showConfirmation = false;
            this.isLoading = true;
            this.error = null;
            this.statusMessage = '';
            if (!isRetry) this.apiRetries = 0;

            try {
                const payload = {
                    project_name: this.projectDetails.projectName,
                    novel_number: this.chapterNumberToFinalize,
                    word_number: this.projectDetails.wordCount 
                };
                const response = await fetch('/api/novel/finalize_chapter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.message || 'Error finalizing chapter.');
                this.statusMessage = responseData.message || 'Chapter finalized successfully.';
                this.$emit('chapter-finalized');
            } catch (e) {
                this.error = e.message;
            } finally {
                this.isLoading = false;
            }
        },
        attemptApiRetry() {
            if (this.canRetryApi) {
                this.apiRetries++;
                this.confirmAndFinalize(true);
            }
        }
    },
    template: `
        <div class="chapter-finalizer">
            <h4>Finalize Chapter</h4>
            <button @click="initiateFinalization" :disabled="isLoading || showConfirmation || !chapterNumberToFinalize">Finalize Chapter {{ chapterNumberToFinalize }}</button>
            
            <div v-if="showConfirmation" class="confirmation-dialog">
                <p>Are you sure you want to finalize Chapter {{ chapterNumberToFinalize }} for project {{ projectDetails.projectName }}?</p>
                <p>(This will update summaries, character states, and the knowledge base based on the current saved version of the chapter draft.)</p>
                <button @click="confirmAndFinalize(false)" :disabled="isLoading">Confirm & Finalize</button>
                <button @click="cancelFinalization" :disabled="isLoading">Cancel</button>
            </div>

            <div v-if="isLoading">Finalizing chapter...</div>
            <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
            <div v-if="error" class="error-message">
                <p>Error: {{ error }}</p>
                <button v-if="canRetryApi" @click="attemptApiRetry">Retry Finalize ({{ apiRetries }}/{{ MAX_RETRIES }})</button>
            </div>
        </div>
    `
};

const KnowledgeManager = {
    props: {
        projectDetails: { type: Object, required: true }
    },
    data() {
        return {
            selectedFile: null,
            isLoadingImport: false, isLoadingClear: false,
            errorImport: null, errorClear: null,
            statusMessageImport: '', statusMessageClear: '',
            importRetries: 0, clearRetries: 0, MAX_RETRIES: 3
        };
    },
    computed: {
        canRetryImport() { return this.errorImport && this.importRetries < this.MAX_RETRIES; },
        canRetryClear() { return this.errorClear && this.clearRetries < this.MAX_RETRIES; }
    },
    methods: {
        handleFileChange(event) {
            this.selectedFile = event.target.files[0];
            this.statusMessageImport = ''; this.errorImport = '';
        },
        async importKnowledge(isRetry = false) {
            if (!this.selectedFile && !isRetry) { 
                this.errorImport = 'Please select a file to import.'; return;
            }
            this.isLoadingImport = true; this.errorImport = null; this.statusMessageImport = '';
            if (!isRetry) this.importRetries = 0;

            const formData = new FormData();
            formData.append('knowledge_file', this.selectedFile);
            formData.append('project_name', this.projectDetails.projectName);

            try {
                const response = await fetch('/api/knowledge/import', { method: 'POST', body: formData });
                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.message || 'Failed to import knowledge.');
                this.statusMessageImport = responseData.message || 'Knowledge imported successfully.';
                this.selectedFile = null; 
                if (this.$refs.fileInput) this.$refs.fileInput.value = ''; // Reset file input via ref
            } catch (e) { this.errorImport = e.message; }
            finally { this.isLoadingImport = false; }
        },
        attemptImportRetry() {
            if (this.canRetryImport) { this.importRetries++; this.importKnowledge(true); }
        },
        async clearVectorStore(isRetry = false) {
            if (!isRetry) { 
                if (!confirm('Are you sure you want to clear the vector store for project "' + this.projectDetails.projectName + '"? This cannot be undone.')) return;
            }
            this.isLoadingClear = true; this.errorClear = null; this.statusMessageClear = '';
            if (!isRetry) this.clearRetries = 0;

            try {
                const response = await fetch('/api/vectorstore/clear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: this.projectDetails.projectName })
                });
                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.message || 'Failed to clear vector store.');
                this.statusMessageClear = responseData.message || 'Vector store cleared.';
            } catch (e) { this.errorClear = e.message; }
            finally { this.isLoadingClear = false; }
        },
        attemptClearRetry() {
            if (this.canRetryClear) { this.clearRetries++; this.clearVectorStore(true); }
        }
    },
    template: `
        <div class="knowledge-manager">
            <h4>Knowledge Management (Project: {{ projectDetails.projectName }})</h4>
            <div>
                <h5>Import Knowledge File (.txt)</h5>
                <input type="file" @change="handleFileChange" accept=".txt" :disabled="isLoadingImport" ref="fileInput">
                <button @click="importKnowledge(false)" :disabled="isLoadingImport || !selectedFile">Import Knowledge</button>
                <div v-if="isLoadingImport">Importing...</div>
                <div v-if="statusMessageImport" class="status-message">{{ statusMessageImport }}</div>
                <div v-if="errorImport" class="error-message">
                    Error: {{ errorImport }} 
                    <button v-if="canRetryImport" @click="attemptImportRetry">Retry Import</button>
                </div>
            </div>
            <hr>
            <div>
                <h5>Vector Store Management</h5>
                <button @click="clearVectorStore(false)" :disabled="isLoadingClear">Clear Project Vector Store</button>
                <div v-if="isLoadingClear">Clearing...</div>
                <div v-if="statusMessageClear" class="status-message">{{ statusMessageClear }}</div>
                <div v-if="errorClear" class="error-message">
                    Error: {{ errorClear }}
                    <button v-if="canRetryClear" @click="attemptClearRetry">Retry Clear</button>
                </div>
            </div>
        </div>
    `
};

const ConsistencyChecker = {
    props: { projectDetails: { type: Object, required: true } },
    data() { 
        return {
            chapterNumberToCheck: 1,
            report: '',
            isLoading: false,
            error: null,
            statusMessage: '',
            apiRetries: 0,
            MAX_RETRIES: 3
        };
    },
    computed: { 
        canRetry() { return this.error && this.apiRetries < this.MAX_RETRIES; } 
    },
    methods: {
        async runCheck(isRetry = false) {
            this.isLoading = true; 
            this.error = null; 
            this.statusMessage = ''; 
            this.report = '';
            if(!isRetry) this.apiRetries = 0;
            
            try {
                const payload = { 
                    project_name: this.projectDetails.projectName, 
                    chapter_number: parseInt(this.chapterNumberToCheck) || 1 
                };
                const response = await fetch('/api/novel/check_consistency', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(payload) 
                });
                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.message || 'Consistency check failed.');
                this.report = responseData.consistency_report || 'No report returned.';
                this.statusMessage = 'Consistency check complete.';
            } catch (e) { this.error = e.message; }
            finally { this.isLoading = false; }
        },
        attemptRetry() { if(this.canRetry) {this.apiRetries++; this.runCheck(true);} }
    },
    template: `
        <div class="consistency-checker">
            <h4>Consistency Checker (Project: {{ projectDetails.projectName }})</h4>
            <div>
                <label>Chapter Number to Check: <input type="number" v-model.number="chapterNumberToCheck" min="1" :disabled="isLoading"></label>
                <button @click="runCheck(false)" :disabled="isLoading">Run Check</button>
            </div>
            <div v-if="isLoading">Checking...</div>
            <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
            <div v-if="error" class="error-message">
                Error: {{ error }} 
                <button v-if="canRetry" @click="attemptRetry">Retry</button>
            </div>
            <div v-if="report"><pre style="white-space: pre-wrap; word-wrap: break-word;">{{ report }}</pre></div>
        </div>
    `
};

const PlotArcsViewer = {
    props: { projectDetails: { type: Object, required: true } },
    data() { 
        return {
            plotArcsText: '',
            isLoading: false,
            error: null,
            statusMessage: '',
            apiRetries: 0,
            MAX_RETRIES: 3
        }; 
    },
    computed: { canRetry() { return this.error && this.apiRetries < this.MAX_RETRIES; } },
    methods: {
        async fetchPlotArcs(isRetry = false) {
            this.isLoading = true; 
            this.error = null; 
            this.statusMessage = ''; 
            // this.plotArcsText = ''; // Keep old text while loading new, or clear: your choice
            if(!isRetry) this.apiRetries = 0;

            try {
                const response = await fetch(\`/api/novel/plot_arcs?project_name=\${encodeURIComponent(this.projectDetails.projectName)}\`);
                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.message || 'Failed to load plot arcs.');
                this.plotArcsText = responseData.plot_arcs_text || '(No plot arcs recorded yet)';
                this.statusMessage = 'Plot arcs loaded.';
            } catch (e) { this.error = e.message; }
            finally { this.isLoading = false; }
        },
        attemptRetry() { if(this.canRetry) {this.apiRetries++; this.fetchPlotArcs(true);} }
    },
    mounted() { this.fetchPlotArcs(false); },
    template: `
        <div class="plot-arcs-viewer">
            <h4>Plot Arcs/Unresolved Conflicts (Project: {{ projectDetails.projectName }})</h4>
            <button @click="fetchPlotArcs(false)" :disabled="isLoading">Refresh Plot Arcs</button>
            <div v-if="isLoading">Loading plot arcs...</div>
            <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
            <div v-if="error" class="error-message">
                Error: {{ error }} 
                <button v-if="canRetry" @click="attemptRetry">Retry</button>
            </div>
            <div v-if="plotArcsText">
                <textarea readonly rows="10" style="width: 95%;">{{ plotArcsText }}</textarea>
            </div>
        </div>
    `
};


const App = {
    components: {
        'config-manager': ConfigManager,
        'project-setup': ProjectSetup,
        'architecture-generator': ArchitectureGenerator,
        'blueprint-generator': BlueprintGenerator,
        'chapter-draft-generator': ChapterDraftGenerator,
        'chapter-finalizer': ChapterFinalizer,
        'knowledge-manager': KnowledgeManager,
        'consistency-checker': ConsistencyChecker,
        'plot-arcs-viewer': PlotArcsViewer
    },
    data() { 
        return {
            vueMessage: 'Novel Generator Web Interface',
            currentProject: null,
            projectSetupDone: false,
            activeChapterForFinalization: null,
            appStatusMessage: '' // For messages at App level
        };
    },
    methods: { 
        onProjectDetailsSubmitted(details) {
            this.currentProject = details;
            this.projectSetupDone = true;
            this.activeChapterForFinalization = null; // Reset when project details change
            this.appStatusMessage = '';
            console.log("Project Details Submitted:", this.currentProject);
        },
        handleDraftCompleted(eventPayload) {
            this.activeChapterForFinalization = eventPayload.novelNumber;
            this.appStatusMessage = \`Chapter \${eventPayload.novelNumber} draft ready for finalization.\`;
            console.log(\`Draft for chapter \${eventPayload.novelNumber} completed.\`);
        },
        handleChapterFinalized() {
            this.appStatusMessage = \`Chapter \${this.activeChapterForFinalization} finalized successfully!\`;
            this.activeChapterForFinalization = null; // Reset for next one
        }
    },
    template: `
        <div>
            <h1>{{ vueMessage }}</h1>
            <config-manager></config-manager>
            <hr>
            <div v-if="appStatusMessage" class="app-status-message" style="padding: 10px; margin-bottom: 10px; background-color: #e6fffa; border: 1px solid #38b2ac;">{{ appStatusMessage }}</div>
            <div v-if="!projectSetupDone">
                <project-setup @project-details-submitted="onProjectDetailsSubmitted"></project-setup>
            </div>
            <div v-if="projectSetupDone && currentProject">
                <h3>Project Details Confirmed:</h3>
                <p><strong>Project Name:</strong> {{ currentProject.projectName }}</p>
                <p><strong>Topic:</strong> {{ currentProject.topic }}</p>
                <p><strong>Genre:</strong> {{ currentProject.genre }}</p>
                <p><strong>Chapters:</strong> {{ currentProject.numChapters }}</p>
                <p><strong>Words/Chapter:</strong> {{ currentProject.wordCount }}</p>
                <p><strong>Guidance:</strong> {{ currentProject.userGuidance || 'N/A' }}</p>
                <button @click="projectSetupDone = false; currentProject = null; activeChapterForFinalization = null; appStatusMessage = '';">Edit Project Details</button>
                <hr>
                <architecture-generator :project-details="currentProject"></architecture-generator>
                <hr>
                <blueprint-generator :project-details="currentProject"></blueprint-generator>
                <hr>
                <chapter-draft-generator 
                    :project-details="currentProject" 
                    @draft-completed="handleDraftCompleted">
                </chapter-draft-generator>
                <hr>
                <chapter-finalizer 
                    v-if="activeChapterForFinalization" 
                    :project-details="currentProject" 
                    :chapter-number-to-finalize="activeChapterForFinalization"
                    @chapter-finalized="handleChapterFinalized">
                </chapter-finalizer>
                <hr>
                <knowledge-manager :project-details="currentProject"></knowledge-manager>
                <hr>
                <consistency-checker :project-details="currentProject"></consistency-checker>
                <hr>
                <plot-arcs-viewer :project-details="currentProject"></plot-arcs-viewer>
            </div>
        </div>
    `
};

createApp(App).mount('#app');
