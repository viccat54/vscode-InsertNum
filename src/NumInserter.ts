/////<reference path="./sprintf.js" />

'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TSSprintf } from './TSSprintf';


interface IInsertSettngs
{
    formatStr : string;
    start : number;
    step : number;
}

/**
 * InsertSettngs
 */
export class InsertSettngs implements IInsertSettngs
{
    
    public formatStr : string;
    public start : number;
    public step : number;
    
    private _disposable: vscode.Disposable;
    
    constructor() 
    {

        let subscriptions: vscode.Disposable[] = [];
        vscode.workspace.onDidChangeConfiguration(this.updateSettings, this, subscriptions);
        this._disposable = vscode.Disposable.from(...subscriptions);
        this.formatStr = "%d";
        this.start = 0;
        this.step = 1;

        this.updateSettings();
    }
    
    private updateSettings()
    {
        var settings = vscode.workspace.getConfiguration("insertnum");
        if (!settings)
        {
            return;
        }
        
        //TODO: format check.
        let formatStr = settings.get<string>("formatstr");
        if (!!formatStr) {
            this.formatStr = formatStr;
        }
        
        let start = settings.get<number>("start");
        if (!!start) {
            this.start = start;
        }
        
        let step = settings.get<number>("step");
        if (!!step) {
            this.step = step;
        }
        
    }
    
    public dispose()
    {
        this._disposable.dispose();
    }
}

/**
 * NumInserter
 */
export class NumInserter 
{
    
    private _settings : InsertSettngs;

    constructor(settings : InsertSettngs)
    {
        this._settings = settings;   
    }
    
    private insertNumbers(settings : IInsertSettngs)
    {
        let textEditor = vscode.window.activeTextEditor;
        if (!textEditor) return;
        
        let selections : readonly vscode.Selection[] = textEditor.selections;
        let newSelection : vscode.Selection[] = [];
        
        const formatStr = settings.formatStr;
        const start = settings.start;
        const step = settings.step;
        
        let cur = start;
        
        textEditor.edit
        (
            function (builder) 
            {
                for (var i = 0; i < selections.length; i++) 
                {
                    let str = TSSprintf.sprintf(formatStr, cur);
                    cur += step;

                    builder.replace(selections[i], str);
                    
                    newSelection[i] = new vscode.Selection(selections[i].anchor, new vscode.Position(selections[i].end.line, selections[i].start.character + str.length))
                    
                }
            }
        ) 


		textEditor.selections = newSelection;

    }
    
    private parseUserInput(input : string) : IInsertSettngs
    {
        
        let retSettings : IInsertSettngs = {
            formatStr : "%d",
            start : 0,
            step : 1 
        };
        
        if (!input) {
            return retSettings;
        }

        //A simple check. :)
        if (!input.includes("%")) {
            vscode.window.showErrorMessage("Wrong format string.");
            return retSettings;
        }
        
        // eg... "%d:1:2"
        if (input.includes(":")) {
            
            let paramList = input.split(":", 3);
            
            retSettings.formatStr = paramList[0];
            
            const strStart = paramList[1];
            const strStep = paramList[2];
            
            if (strStart.includes(".")) {
                retSettings.start = parseFloat(strStart);
            } 
            else{
                retSettings.start = parseInt(strStart);
            }
            
            if (strStep.includes(".")) {
                retSettings.step = parseFloat(strStep);
            } 
            else{
                retSettings.step = parseInt(strStep);
            }
        }
        //eg... "%d"
        else{
            retSettings.formatStr = input;
        }
        
        return retSettings;
    }
    
    public processInsert()
    {
        //Input default numbers first.
        this.insertNumbers(this._settings);

        
        const opt : vscode.InputBoxOptions = {
            placeHolder : "default: %d:0:1",
            prompt : "Input format or format:start:step"
        }
        const input = vscode.window.showInputBox(opt);
        
        if (!input)
        {
            return;
        }
        
        let parseUserInput = this.parseUserInput;
        let insertNumbers = this.insertNumbers;
        
        let newSettings = null;
        
        input.then(function (val:string | undefined) {
            if (!val) return;

            newSettings = parseUserInput(val);
            
            if (!newSettings) {
                return;
            }
        
            insertNumbers(newSettings);
        })
        
    }
    

    public dispose()
    {
        this._settings.dispose();
    }
}