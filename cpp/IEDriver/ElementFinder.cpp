#include "StdAfx.h"
#include "atoms.h"
#include "Session.h"

namespace webdriver {

ElementFinder::ElementFinder(std::wstring locator) {
	this->locator_ = locator;
}

ElementFinder::~ElementFinder() {
}

int ElementFinder::FindElement(Session* session, ElementHandle parent_wrapper, const std::wstring& criteria, Json::Value *found_element) {
	BrowserHandle browser;
	int status_code = session->GetCurrentBrowser(&browser);
	if (status_code == SUCCESS) {
		std::wstring criteria_object_script = L"(function() { return function(){ return  { " + this->locator_ + L" : \"" + criteria + L"\" }; };})();";
		CComPtr<IHTMLDocument2> doc;
		browser->GetDocument(&doc);

		ScriptWrapper criteria_wrapper(doc, criteria_object_script, 0);
		status_code = criteria_wrapper.Execute();
		if (status_code == SUCCESS) {
			CComVariant criteria_object;
			::VariantCopy(&criteria_object, &criteria_wrapper.result());

			// The atom is just the definition of an anonymous
			// function: "function() {...}"; Wrap it in another function so we can
			// invoke it with our arguments without polluting the current namespace.
			std::wstring script_source(L"(function() { return (");
			script_source += atoms::FIND_ELEMENT;
			script_source += L")})();";

			ScriptWrapper script_wrapper(doc, script_source, 2);
			script_wrapper.AddArgument(criteria_object);
			if (parent_wrapper) {
				script_wrapper.AddArgument(parent_wrapper->element());
			}

			status_code = script_wrapper.Execute();
			if (status_code == SUCCESS && script_wrapper.ResultIsElement()) {
				script_wrapper.ConvertResultToJsonValue(session, found_element);
			} else {
				status_code = ENOSUCHELEMENT;
			}
		} else {
			status_code = ENOSUCHELEMENT;
		}
	}
	return status_code;
}

int ElementFinder::FindElements(Session* session, ElementHandle parent_wrapper, const std::wstring& criteria, Json::Value *found_elements) {
	BrowserHandle browser;
	int status_code = session->GetCurrentBrowser(&browser);
	if (status_code == SUCCESS) {
		std::wstring criteria_object_script = L"(function() { return function(){ return  { " + this->locator_ + L" : \"" + criteria + L"\" }; };})();";
		CComPtr<IHTMLDocument2> doc;
		browser->GetDocument(&doc);

		ScriptWrapper criteria_wrapper(doc, criteria_object_script, 0);
		status_code = criteria_wrapper.Execute();
		if (status_code == SUCCESS) {
			CComVariant criteria_object;
			::VariantCopy(&criteria_object, &criteria_wrapper.result());

			// The atom is just the definition of an anonymous
			// function: "function() {...}"; Wrap it in another function so we can
			// invoke it with our arguments without polluting the current namespace.
			std::wstring script_source(L"(function() { return (");
			script_source += atoms::FIND_ELEMENTS;
			script_source += L")})();";

			ScriptWrapper script_wrapper(doc, script_source, 2);
			script_wrapper.AddArgument(criteria_object);
			if (parent_wrapper) {
				script_wrapper.AddArgument(parent_wrapper->element());
			}

			status_code = script_wrapper.Execute();
			if (status_code == SUCCESS) {
				if (script_wrapper.ResultIsArray() || script_wrapper.ResultIsElementCollection()) {
					script_wrapper.ConvertResultToJsonValue(session, found_elements);
				}
			}
		}
	}
	return status_code;
}

} // namespace webdriver