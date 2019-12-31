import { Category } from '../domain/Category';
import { Application } from '../domain/Application';
import { Script } from '@/domain/Script';
// import applicationFile from 'js-yaml-loader!@/application/application.yaml';
// import applicationFile from 'json-loader!yaml-loader!@/application/application.yaml';
import applicationFile, { YamlCategory, YamlScript, YamlDocumentable } from 'js-yaml-loader!./application.yaml';
// import test from './test-loader!./test.txt';

interface ApplicationResult {
    readonly application: Application;
    readonly selectedScripts: Script[];
}

export class ApplicationParser {

    public static buildApplication(): ApplicationResult {
        const name = applicationFile.name as string;
        const version = applicationFile.version as number;
        const categories = new Array<Category>();
        const selectedScripts = new Array<Script>();
        if (!applicationFile.actions || applicationFile.actions.length <= 0) {
            throw new Error('Application does not define any action');
        }
        for (const action of applicationFile.actions) {
            const category = ApplicationParser.parseCategory(action, selectedScripts);
            categories.push(category);
        }
        const app = new Application(name, version, categories);
        return {application: app, selectedScripts};
    }
    private static categoryIdCounter = 0;

    private static parseCategory(category: YamlCategory, selectedScripts: Script[]): Category {
        if (!category.children || category.children.length <= 0) {
            throw Error('Category has no children');
        }
        const subCategories = new Array<Category>();
        const subScripts = new Array<Script>();
        for (const categoryOrScript of category.children) {
            if (ApplicationParser.isCategory(categoryOrScript)) {
                const subCategory = ApplicationParser.parseCategory(categoryOrScript as YamlCategory, selectedScripts);
                subCategories.push(subCategory);
            } else if (ApplicationParser.isScript(categoryOrScript)) {
                const yamlScript = categoryOrScript as YamlScript;
                const script = new Script(
                    /* name */ yamlScript.name,
                    /* code */ yamlScript.code,
                    /* docs */ this.parseDocUrls(yamlScript));
                subScripts.push(script);
                if (yamlScript.default === true) {
                    selectedScripts.push(script);
                }
            } else {
                throw new Error(`Child element is neither a category or a script.
                        Parent: ${category.category}, element: ${categoryOrScript}`);
            }
        }
        return new Category(
            /*id*/ ApplicationParser.categoryIdCounter++,
            /*name*/ category.category,
            /*docs*/ this.parseDocUrls(category),
            /*categories*/ subCategories,
            /*scripts*/ subScripts,
        );
    }

    private static parseDocUrls(documentable: YamlDocumentable): ReadonlyArray<string> {
        if (!documentable.docs) {
            return [];
        }
        const docs = documentable.docs;
        const result = new Array<string>();
        const addDoc = (doc: string) => {
            if (!doc) {
                throw new Error('Documentiton url is null or empty');
            }
            if (doc.includes('\n')) {
                throw new Error('Documentation url cannot be multi-lined.');
            }
            result.push(doc);
        };
        if (docs instanceof Array) {
            for (const doc of docs) {
                if (typeof doc !== 'string') {
                    throw new Error('Docs field (documentation url) must be an array of strings');
                }
                addDoc(doc as string);
            }
        } else if (typeof docs === 'string') {
            addDoc(docs as string);
        } else {
            throw new Error('Docs field (documentation url) must a string or array of strings');
        }
        return result;
    }

    private static isScript(categoryOrScript: any): boolean {
        return categoryOrScript.code && categoryOrScript.code.length > 0;
    }
    private static isCategory(categoryOrScript: any): boolean {
        return categoryOrScript.category && categoryOrScript.category.length > 0;
    }
}
