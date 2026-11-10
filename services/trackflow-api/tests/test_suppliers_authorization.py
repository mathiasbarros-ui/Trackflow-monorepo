def test_supplier_endpoints_reject_non_admin(auth_client):
    response = auth_client.get("/suppliers")

    assert response.status_code == 403